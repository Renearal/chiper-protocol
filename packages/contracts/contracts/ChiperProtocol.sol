// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint128, ebool, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Chiper Protocol - Trustless Confidential Transfer Vault
/// @notice Encrypted user balances with FHE-powered confidential withdrawals
/// @dev TVL is publicly decryptable for transparency; uses fhevm 0.9.1 API
contract ChiperProtocol is ZamaEthereumConfig, ReentrancyGuard {
    /* ============================== STATE ============================== */

    mapping(address => euint128) private _balances;
    euint128 private _tvl;

    mapping(uint256 => PendingWithdrawal) private _pendingWithdrawals;
    mapping(address => uint256[]) private _userActiveRequests;

    uint256 private _requestNonce;

    uint256 public constant WITHDRAWAL_TIMEOUT = 6 hours;
    uint256 public constant MAX_ACTIVE_REQUESTS = 10;
    uint256 public constant PROTOCOL_VERSION = 2;

    /* ============================== STRUCTS ============================== */

    struct PendingWithdrawal {
        address payable recipient;
        address requester;
        bool processed;
        uint256 timestamp;
        euint128 lockedAmount;
        bytes32 amountHandle;
    }

    /* ============================== EVENTS ============================== */

    event Deposit(address indexed user, uint256 amount);
    event WithdrawalRequested(
        address indexed user,
        address indexed recipient,
        uint256 indexed requestId,
        bytes32 amountHandle,
        uint256 timestamp
    );
    event Withdrawn(address indexed user, address indexed recipient, uint128 amount);
    event WithdrawalRejectedZero(address indexed user, address indexed recipient, uint256 indexed requestId);
    event WithdrawalCancelled(address indexed user, uint256 indexed requestId, string reason);

    /* ============================== ERRORS ============================== */

    error InvalidDepositAmount();
    error DepositTooLarge();
    error InvalidRecipient();
    error TooManyActiveRequests();
    error RequestNotFound();
    error RequestAlreadyProcessed();
    error NotRequestOwner();
    error WithdrawalNotTimedOut();
    error InsufficientVaultBalance();
    error ETHTransferFailed();
    error InvalidKMSSignatures();

    /* ============================== MODIFIERS ============================== */

    modifier validRecipient(address recipient) {
        if (recipient == address(0)) revert InvalidRecipient();
        _;
    }

    /* ============================== CONSTRUCTOR ============================== */

    constructor() {
        _tvl = FHE.asEuint128(0);
        FHE.allowThis(_tvl);
        FHE.makePubliclyDecryptable(_tvl);
    }

    /* ============================== DEPOSIT ============================== */

    function depositETH() external payable {
        if (msg.value == 0) revert InvalidDepositAmount();
        if (msg.value > type(uint128).max) revert DepositTooLarge();

        if (FHE.toBytes32(_balances[msg.sender]) == bytes32(0)) {
            _balances[msg.sender] = FHE.asEuint128(0);
            FHE.allowThis(_balances[msg.sender]);
        }

        euint128 amount = FHE.asEuint128(uint128(msg.value));
        FHE.allowThis(amount);

        _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
        _tvl = FHE.add(_tvl, amount);

        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_tvl);
        FHE.makePubliclyDecryptable(_tvl);

        emit Deposit(msg.sender, msg.value);
    }

    /* ============================== WITHDRAW ============================== */

    /// @notice Request withdrawal - Step 1: Lock amount and emit handle for off-chain decryption
    function requestWithdraw(
        address payable recipient,
        externalEuint128 encryptedAmount,
        bytes calldata inputProof
    )
        external
        validRecipient(recipient)
        returns (uint256 requestId)
    {
        if (_userActiveRequests[msg.sender].length >= MAX_ACTIVE_REQUESTS) {
            revert TooManyActiveRequests();
        }

        if (FHE.toBytes32(_balances[msg.sender]) == bytes32(0)) {
            _balances[msg.sender] = FHE.asEuint128(0);
            FHE.allowThis(_balances[msg.sender]);
        }

        euint128 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowThis(amount);

        ebool isValid = FHE.or(
            FHE.lt(amount, _balances[msg.sender]),
            FHE.eq(amount, _balances[msg.sender])
        );
        FHE.allowThis(isValid);

        euint128 txAmount = FHE.select(isValid, amount, FHE.asEuint128(0));
        FHE.allowThis(txAmount);

        _balances[msg.sender] = FHE.sub(_balances[msg.sender], txAmount);
        _tvl = FHE.sub(_tvl, txAmount);

        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_tvl);
        FHE.makePubliclyDecryptable(_tvl);

        // Mark txAmount as publicly decryptable for off-chain decryption
        FHE.makePubliclyDecryptable(txAmount);

        bytes32 amountHandle = FHE.toBytes32(txAmount);

        // Generate unique requestId
        requestId = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp, _requestNonce++)));

        _pendingWithdrawals[requestId] = PendingWithdrawal({
            recipient: recipient,
            requester: msg.sender,
            processed: false,
            timestamp: block.timestamp,
            lockedAmount: txAmount,
            amountHandle: amountHandle
        });

        _userActiveRequests[msg.sender].push(requestId);

        // Emit event with handle for off-chain decryption
        emit WithdrawalRequested(msg.sender, recipient, requestId, amountHandle, block.timestamp);
    }

    /// @notice Complete withdrawal - Step 2: Called by relayer/user with decrypted value and proof
    function finalizeWithdrawal(
        uint256 requestId,
        uint128 clearAmount,
        bytes calldata decryptionProof
    )
        external
        nonReentrant
    {
        PendingWithdrawal storage w = _pendingWithdrawals[requestId];
        if (w.requester == address(0)) revert RequestNotFound();
        if (w.processed) revert RequestAlreadyProcessed();

        // Verify KMS signatures
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = w.amountHandle;
        FHE.checkSignatures(handles, abi.encode(clearAmount), decryptionProof);

        w.processed = true;

        if (clearAmount == 0) {
            _removeActiveRequest(w.requester, requestId);
            emit WithdrawalRejectedZero(w.requester, w.recipient, requestId);
            delete _pendingWithdrawals[requestId];
            return;
        }

        if (address(this).balance < clearAmount) revert InsufficientVaultBalance();

        (bool ok, ) = w.recipient.call{ value: uint256(clearAmount) }("");
        if (!ok) revert ETHTransferFailed();

        _removeActiveRequest(w.requester, requestId);
        emit Withdrawn(w.requester, w.recipient, clearAmount);
        delete _pendingWithdrawals[requestId];
    }

    /// @notice Cancel a timed-out withdrawal
    function cancelTimedOutWithdrawal(uint256 requestId) external {
        PendingWithdrawal storage w = _pendingWithdrawals[requestId];

        if (w.requester == address(0)) revert RequestNotFound();
        if (w.processed) revert RequestAlreadyProcessed();
        if (w.requester != msg.sender) revert NotRequestOwner();

        if (block.timestamp < w.timestamp + WITHDRAWAL_TIMEOUT) {
            revert WithdrawalNotTimedOut();
        }

        FHE.allowThis(w.lockedAmount);
        _balances[msg.sender] = FHE.add(_balances[msg.sender], w.lockedAmount);
        _tvl = FHE.add(_tvl, w.lockedAmount);

        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_tvl);
        FHE.makePubliclyDecryptable(_tvl);

        w.processed = true;
        _removeActiveRequest(msg.sender, requestId);

        emit WithdrawalCancelled(msg.sender, requestId, "timeout");
        delete _pendingWithdrawals[requestId];
    }

    /* ============================== VIEWS ============================== */

    function myBalance() external view returns (euint128) {
        return _balances[msg.sender];
    }

    function getBalance(address user) external view returns (euint128) {
        return _balances[user];
    }

    function encryptedTVL() external view returns (euint128) {
        return _tvl;
    }

    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getActiveRequests(address user) external view returns (uint256[] memory) {
        return _userActiveRequests[user];
    }

    function getWithdrawalRequest(uint256 requestId)
        external
        view
        returns (
            address recipient,
            address requester,
            bool processed,
            uint256 timestamp,
            bytes32 amountHandle
        )
    {
        PendingWithdrawal memory r = _pendingWithdrawals[requestId];
        return (r.recipient, r.requester, r.processed, r.timestamp, r.amountHandle);
    }

    function isWithdrawalTimedOut(uint256 requestId) external view returns (bool) {
        PendingWithdrawal memory r = _pendingWithdrawals[requestId];
        if (r.requester == address(0) || r.processed) return false;
        return block.timestamp >= r.timestamp + WITHDRAWAL_TIMEOUT;
    }

    function getActiveRequestCount(address user) external view returns (uint256) {
        return _userActiveRequests[user].length;
    }

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
