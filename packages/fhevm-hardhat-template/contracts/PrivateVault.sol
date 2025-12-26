// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint128, ebool, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {EthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Chiper Protocol - Trustless Confidential Transfer Vault
/// @notice Encrypted user balances with FHE-powered confidential withdrawals
/// @dev TVL is publicly decryptable for transparency; no owner/emergency controls
contract ChiperProtocol is EthereumConfig, ReentrancyGuard {
    /* ============================== STATE ============================== */

    mapping(address => euint128) private _balances; // encrypted balance per user (PRIVATE)
    euint128 private _tvl;                           // encrypted TVL (publicly decryptable)

    mapping(uint256 => PendingWithdrawal) private _pendingWithdrawals;
    mapping(address => uint256[]) private _userActiveRequests;

    uint256 public constant WITHDRAWAL_TIMEOUT = 6 hours;
    uint256 public constant MAX_ACTIVE_REQUESTS = 10;
    uint256 public constant PROTOCOL_VERSION = 1;

    /* ============================== STRUCTS ============================== */

    struct PendingWithdrawal {
        address payable recipient;
        address requester;
        bool processed;
        uint256 timestamp;
        euint128 lockedAmount; // encrypted amount reserved from user's balance
    }

    /* ============================== EVENTS ============================== */

    event Deposit(address indexed user, uint256 amount);
    event WithdrawalRequested(address indexed user, address indexed recipient, uint256 indexed requestId, uint256 timestamp);
    event Withdrawn(address indexed user, address indexed recipient, uint128 amount);
    event WithdrawalRejectedZero(address indexed user, address indexed recipient, uint256 indexed requestId);
    event WithdrawalCancelled(address indexed user, uint256 indexed requestId, string reason);

    /* ============================== ERRORS ============================== */

    error InvalidDepositAmount();
    error DepositTooLarge();
    error InvalidRecipient();
    error TooManyActiveRequests();
    error RequestIdConflict();
    error RequestNotFound();
    error RequestAlreadyProcessed();
    error NotRequestOwner();
    error WithdrawalNotTimedOut();
    error InsufficientVaultBalance();
    error ETHTransferFailed();

    /* ============================== MODIFIERS ============================== */

    modifier validRecipient(address recipient) {
        if (recipient == address(0)) revert InvalidRecipient();
        _;
    }

    /* ============================== CONSTRUCTOR ============================== */

    constructor() {
        // Initialize encrypted TVL with zero value
        _tvl = FHE.asEuint128(0);
        
        // Allow contract to use it and make publicly decryptable
        FHE.allowThis(_tvl);
        FHE.makePubliclyDecryptable(_tvl);
    }

    /* ============================== DEPOSIT ============================== */

    /// @notice Deposit ETH (amount public in tx; balance & TVL recorded privately)
    function depositETH() external payable {
        if (msg.value == 0) revert InvalidDepositAmount();
        if (msg.value > type(uint128).max) revert DepositTooLarge();

        // Lazy-init user balance handle if missing
        if (FHE.toBytes32(_balances[msg.sender]) == bytes32(0)) {
            _balances[msg.sender] = FHE.asEuint128(0);
            FHE.allowThis(_balances[msg.sender]);
        }

        euint128 amount = FHE.asEuint128(uint128(msg.value));
        FHE.allowThis(amount);

        // Update encrypted state
        _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
        _tvl = FHE.add(_tvl, amount);

        // ACL updates
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_tvl);

        emit Deposit(msg.sender, msg.value);
    }

    /* ============================== WITHDRAW ============================== */

    /// @notice Request withdrawal with encrypted amount from UI
    /// @param recipient Destination address
    /// @param encryptedAmount Encrypted amount (external handle from SDK)
    /// @param inputProof Proof from Relayer SDK (EIP-712 flow)
    function requestWithdraw(
        address payable recipient,
        externalEuint128 encryptedAmount,
        bytes calldata inputProof
    )
        external
        validRecipient(recipient)
        returns (uint256 requestId)
    {
        // Per-user limit
        if (_userActiveRequests[msg.sender].length >= MAX_ACTIVE_REQUESTS) {
            revert TooManyActiveRequests();
        }

        // Lazy-init user balance handle if missing
        if (FHE.toBytes32(_balances[msg.sender]) == bytes32(0)) {
            _balances[msg.sender] = FHE.asEuint128(0);
            FHE.allowThis(_balances[msg.sender]);
        }

        // Import encrypted input (bound via inputProof)
        euint128 amount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Grant ACL for contract to use imported amount
        FHE.allowThis(amount);
        
        // Compute txAmount = min(amount, balance); else 0
        ebool isValid = FHE.or(
            FHE.lt(amount, _balances[msg.sender]),
            FHE.eq(amount, _balances[msg.sender])
        );
        
        // Grant ACL for intermediate ebool (defensive programming)
        FHE.allowThis(isValid);
        
        euint128 txAmount = FHE.select(isValid, amount, FHE.asEuint128(0));

        // Lock: subtract from balance & TVL privately
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], txAmount);
        _tvl = FHE.sub(_tvl, txAmount);

        // ACL updates
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_tvl);
        FHE.allowThis(txAmount);

        // Request decryption with proper array initialization
        bytes32[] memory ciphertexts = new bytes32[](1);
        ciphertexts[0] = FHE.toBytes32(txAmount);
        requestId = FHE.requestDecryption(ciphertexts, this.onWithdrawCallback.selector);

        // Defensive: requestId collision
        if (_pendingWithdrawals[requestId].requester != address(0)) revert RequestIdConflict();

        _pendingWithdrawals[requestId] = PendingWithdrawal({
            recipient: recipient,
            requester: msg.sender,
            processed: false,
            timestamp: block.timestamp,
            lockedAmount: txAmount
        });

        _userActiveRequests[msg.sender].push(requestId);
        emit WithdrawalRequested(msg.sender, recipient, requestId, block.timestamp);
    }

    /// @notice Oracle callback: verify → decode → send ETH / reject if 0
    function onWithdrawCallback(
        uint256 requestId,
        bytes calldata cleartexts,
        bytes calldata signatures
    )
        external
        nonReentrant
    {
        // Authenticate oracle payload
        FHE.checkSignatures(requestId, cleartexts, signatures);

        PendingWithdrawal storage w = _pendingWithdrawals[requestId];
        if (w.requester == address(0)) revert RequestNotFound();
        if (w.processed) revert RequestAlreadyProcessed();

        // CEI: mark processed before external call
        w.processed = true;

        // Decode decrypted amount
        uint128 amount = abi.decode(cleartexts, (uint128));

        // If 0 → do not send ETH; clean up
        if (amount == 0) {
            _removeActiveRequest(w.requester, requestId);
            emit WithdrawalRejectedZero(w.requester, w.recipient, requestId);
            delete _pendingWithdrawals[requestId];
            return;
        }

        // Ensure vault liquidity
        if (address(this).balance < amount) revert InsufficientVaultBalance();

        // Transfer ETH
        (bool ok, ) = w.recipient.call{ value: uint256(amount) }("");
        if (!ok) revert ETHTransferFailed();

        // Cleanup
        _removeActiveRequest(w.requester, requestId);
        emit Withdrawn(w.requester, w.recipient, amount);
        delete _pendingWithdrawals[requestId];
    }

    /// @notice Cancel a timed-out withdrawal and refund the encrypted amount
    function cancelTimedOutWithdrawal(uint256 requestId) external {
        PendingWithdrawal storage w = _pendingWithdrawals[requestId];

        if (w.requester == address(0)) revert RequestNotFound();
        if (w.processed) revert RequestAlreadyProcessed();
        if (w.requester != msg.sender) revert NotRequestOwner();

        if (block.timestamp < w.timestamp + WITHDRAWAL_TIMEOUT) {
            revert WithdrawalNotTimedOut();
        }

        // CRITICAL - Grant ACL for lockedAmount before operations
        FHE.allowThis(w.lockedAmount);

        // Refund locked encrypted amount to user's balance
        _balances[msg.sender] = FHE.add(_balances[msg.sender], w.lockedAmount);
        _tvl = FHE.add(_tvl, w.lockedAmount);

        // ACL updates
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_tvl);

        w.processed = true;
        _removeActiveRequest(msg.sender, requestId);

        emit WithdrawalCancelled(msg.sender, requestId, "timeout");
        delete _pendingWithdrawals[requestId];
    }

    /* ============================== VIEWS ============================== */

    /// @notice Get caller's encrypted balance
    /// @dev User must have permission to decrypt via Zama SDK
    function myBalance() external view returns (euint128) {
        return _balances[msg.sender];
    }

    /// @notice Get any user's encrypted balance (admin/audit function)
    /// @dev Requires proper ACL permissions to decrypt
    function getBalance(address user) external view returns (euint128) {
        return _balances[user];
    }

    /// @notice Get encrypted TVL (publicly decryptable)
    function encryptedTVL() external view returns (euint128) {
        return _tvl;
    }

    /// @notice Get vault's actual ETH balance (plaintext)
    /// @dev This is the real liquidity available for withdrawals
    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get active withdrawal requests for a user
    function getActiveRequests(address user) external view returns (uint256[] memory) {
        return _userActiveRequests[user];
    }

    /// @notice Get withdrawal request details
    function getWithdrawalRequest(uint256 requestId)
        external
        view
        returns (
            address recipient,
            address requester,
            bool processed,
            uint256 timestamp
        )
    {
        PendingWithdrawal memory r = _pendingWithdrawals[requestId];
        return (r.recipient, r.requester, r.processed, r.timestamp);
    }

    /// @notice Check if withdrawal request has timed out
    function isWithdrawalTimedOut(uint256 requestId) external view returns (bool) {
        PendingWithdrawal memory r = _pendingWithdrawals[requestId];
        if (r.requester == address(0) || r.processed) return false;
        return block.timestamp >= r.timestamp + WITHDRAWAL_TIMEOUT;
    }

    /// @notice Get count of active requests for a user
    function getActiveRequestCount(address user) external view returns (uint256) {
        return _userActiveRequests[user].length;
    }

    /// @notice Get protocol version
    function version() external pure returns (uint256) {
        return PROTOCOL_VERSION;
    }

    /* ============================== INTERNAL ============================== */

    function _removeActiveRequest(address user, uint256 requestId) private {
        uint256[] storage arr = _userActiveRequests[user];
        uint256 n = arr.length;
        for (uint256 i = 0; i < n; i++) {
            if (arr[i] == requestId) {
                arr[i] = arr[n - 1];
                arr.pop();
                break;
            }
        }
    }

    /* ============================== SAFETY ============================== */

    receive() external payable {
        revert("ChiperProtocol: use depositETH()");
    }

    fallback() external payable {
        revert("ChiperProtocol: function does not exist");
    }
}