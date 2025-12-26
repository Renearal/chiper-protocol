# Contract Improvements - Chiper Protocol v1

## 📋 Summary of Changes

**Major architectural improvements:**
- Enhanced withdrawal security with timeout & cancellation
- Improved request tracking system
- Better error handling with custom errors
- Multiple view functions for transparency

---

## 🔧 Core Improvements

### 1. **Withdrawal Request Tracking System**

**Implementation:**
```solidity
struct PendingWithdrawal {
    address payable recipient;
    address requester;
    bool processed;
    uint256 timestamp;
    euint128 lockedAmount;  // encrypted amount locked from balance
}

mapping(uint256 => PendingWithdrawal) private _pendingWithdrawals;
mapping(address => uint256[]) private _userActiveRequests;
```

**Why Important:**
- Track all pending withdrawals with full metadata
- Prevents duplicate processing
- Enables timeout & cancellation features
- Stores locked amount for potential refunds

---

### 2. **Amount Validation Logic**

**Implementation:**
```solidity
// Compute txAmount = min(amount, balance); else 0
ebool isValid = FHE.or(
    FHE.lt(amount, _balances[msg.sender]),
    FHE.eq(amount, _balances[msg.sender])
);

euint128 txAmount = FHE.select(isValid, amount, FHE.asEuint128(0));
```

**Why Critical:**
- Uses `FHE.or(FHE.lt, FHE.eq)` to implement `<=` comparison
- Ensures user can withdraw full balance (including exact match)
- Returns 0 if amount > balance (privacy-preserving rejection)
- All operations on encrypted values

**Result:**
- ✅ Can withdraw full balance
- ✅ No privacy leakage
- ✅ Automatic amount capping

---

### 3. **Zero Balance Handling**

**Implementation:**
```solidity
event WithdrawalRejectedZero(address indexed user, address indexed recipient, uint256 indexed requestId);

// In callback after oracle decryption:
if (amount == 0) {
    _removeActiveRequest(w.requester, requestId);
    emit WithdrawalRejectedZero(w.requester, w.recipient, requestId);
    delete _pendingWithdrawals[requestId];
    return;
}
```

**Why Important:**
- Cannot check encrypted balance on-chain (privacy!)
- Emit event after oracle decrypts to 0
- Skip ETH transfer (gas savings)
- Clean up pending request
- UI can detect event and show warning

---

### 4. **Withdrawal Timeout & Cancellation**

**Implementation:**
```solidity
uint256 public constant WITHDRAWAL_TIMEOUT = 6 hours;

function cancelTimedOutWithdrawal(uint256 requestId) external {
    PendingWithdrawal storage w = _pendingWithdrawals[requestId];
    
    if (block.timestamp < w.timestamp + WITHDRAWAL_TIMEOUT) {
        revert WithdrawalNotTimedOut();
    }
    
    // Refund locked encrypted amount
    _balances[msg.sender] = FHE.add(_balances[msg.sender], w.lockedAmount);
    _tvl = FHE.add(_tvl, w.lockedAmount);
    
    emit WithdrawalCancelled(msg.sender, requestId, "timeout");
}
```

**Why Critical:**
- Oracle might fail or delay
- User can recover locked funds after 6 hours
- Prevents permanent fund lockup
- Maintains privacy (refunds encrypted amount)

---

### 5. **Custom Errors for Gas Efficiency**

**Implementation:**
```solidity
error InvalidDepositAmount();
error TooManyActiveRequests();
error RequestNotFound();
error RequestAlreadyProcessed();
error WithdrawalNotTimedOut();
error InsufficientVaultBalance();
error ETHTransferFailed();
```

**Why Important:**
- More gas-efficient than `require()` strings
- Clearer error handling
- Better debugging experience
- Modern Solidity best practice

---

## ✨ Feature Enhancements

### 1. **Multiple View Functions for Transparency**

**Implementation:**
```solidity
// Get user's encrypted balance
function myBalance() external view returns (euint128);

// Get any user's balance (audit function)
function getBalance(address user) external view returns (euint128);

// Get vault's ETH liquidity (plaintext)
function vaultBalance() external view returns (uint256);

// Get user's active withdrawal requests
function getActiveRequests(address user) external view returns (uint256[] memory);

// Get withdrawal request details
function getWithdrawalRequest(uint256 requestId) external view returns (...);

// Check if withdrawal timed out
function isWithdrawalTimedOut(uint256 requestId) external view returns (bool);

// Get active request count
function getActiveRequestCount(address user) external view returns (uint256);

// Get protocol version
function version() external pure returns (uint256);
```

**Why Important:**
- Full transparency for users & auditors
- Track withdrawal status off-chain
- Check timeout eligibility
- Monitor vault liquidity
- Version tracking for upgrades

---

### 2. **Request Limits & DoS Protection**

**Implementation:**
```solidity
uint256 public constant MAX_ACTIVE_REQUESTS = 10;

if (_userActiveRequests[msg.sender].length >= MAX_ACTIVE_REQUESTS) {
    revert TooManyActiveRequests();
}
```

**Why Important:**
- Prevents spam/DoS attacks
- Limits per-user active requests
- Protects oracle resources
- Reasonable limit for normal usage

---

### 3. **UI Improvements**

**Zero Balance Warning:**
```tsx
{(!vault.balanceHandle || vault.balanceHandle === "0x00...") && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
    <p className="text-yellow-800">⚠️ No Balance Yet</p>
    <p className="text-yellow-700">
      This is a new contract. Please deposit first.
    </p>
  </div>
)}
```

**Better Error Messages:**
```tsx
if (errorMsg.includes("HTTP code 500") || errorMsg.includes("relayer")) {
  errorMsg = "⚠️ Decryption failed: Balance might be zero. Try depositing first.";
} else if (errorMsg.includes("Failed to fetch")) {
  errorMsg = "⚠️ Network error: Cannot reach Zama relayer.";
}
```

**Event Name Updates:**
- `WithdrawRequested` → `WithdrawalRequested`
- `WithdrawRejected` → `WithdrawalRejected`
- Added: `WithdrawalCancelled`

---

## 📊 Feature Comparison

| Feature | Before | After |
|---------|--------|-------|
| **Full Balance Withdrawal** | ⚠️ Depends on implementation | ✅ FHE.or(lt, eq) logic |
| **Request Tracking** | ❌ Basic mapping | ✅ Full struct with metadata |
| **Timeout & Cancellation** | ❌ None | ✅ 6-hour timeout + refund |
| **Zero Balance Handling** | ⚠️ Silent fail | ✅ Event + cleanup |
| **Error Handling** | ❌ require() strings | ✅ Custom errors (gas efficient) |
| **View Functions** | ⚠️ Basic (2-3) | ✅ Comprehensive (8+) |
| **DoS Protection** | ❌ None | ✅ MAX_ACTIVE_REQUESTS limit |
| **UI Warnings** | ❌ None | ✅ Zero balance warnings |
| **Event Names** | `WithdrawXxx` | `WithdrawalXxx` (consistent) |
| **Request Cleanup** | ❌ Manual | ✅ Automatic via helper |

---

## 🎯 User Experience Improvements

### Scenario 1: Withdraw Full Balance

```
User balance: 1.0 ETH (encrypted)
User tries: Withdraw 1.0 ETH
Validation: FHE.or(FHE.lt(1.0, 1.0), FHE.eq(1.0, 1.0)) = true
txAmount: 1.0 ETH (full balance)
Result: ✅ Success
Message: "Withdrawal requested! Oracle processing..."
```

---

### Scenario 2: Oracle Timeout & Cancellation

**Problem:**
```
User requests withdrawal
Oracle delayed/failed for >6 hours
Funds locked in PendingWithdrawal
```

**Solution:**
```
After 6 hours:
1. User calls cancelTimedOutWithdrawal(requestId)
2. Contract checks: block.timestamp >= timestamp + 6 hours
3. Refund encrypted amount: balance += lockedAmount
4. Clean up request
5. Emit WithdrawalCancelled event
Result: ✅ User recovers funds
```

---

### Scenario 3: Withdraw with Zero Balance

```
User balance: 0 ETH
UI: ⚠️ "No Balance Yet - Please deposit ETH first"
Button: Disabled

If user forces raw call:
  On-chain: txAmt = 0 (FHE.select logic)
  Oracle: Decrypts to 0
  Callback: 
    - Emit WithdrawalRejectedZero
    - Skip ETH transfer
    - Clean up request
  UI: "Withdrawal rejected: Zero balance"
```

---

### Scenario 4: Multiple Active Requests

**Problem:**
```
User spams withdrawal requests
Could DoS oracle or gas griefing
```

**Solution:**
```
Request #1-10: ✅ Accepted
Request #11: ❌ Revert TooManyActiveRequests()
User must wait for completion or cancel timeout
```

---

## 🔐 Security Considerations

### Privacy Maintained ✅

All improvements maintain FHE privacy guarantees:

1. **Balance stays encrypted on-chain**
   - `_balances[user]` is `euint128` (never decrypted on-chain)
   - Only user can decrypt via Zama SDK
   - Validation uses FHE operations (lt, eq, or)

2. **Amount encrypted in withdrawal request**
   - User encrypts amount client-side with Relayer SDK
   - Imported via `FHE.fromExternal()` with proof
   - Contract operates on encrypted value only

3. **Oracle-only decryption**
   - Only Zama oracle can decrypt via `requestDecryption()`
   - Callback authenticated via `FHE.checkSignatures()`
   - User cannot fake or manipulate decrypted values

4. **Timeout refund preserves privacy**
   - Refunded amount stays encrypted (`lockedAmount` is `euint128`)
   - No plaintext amount revealed during cancellation
   - Balance privacy maintained throughout

### Events Do Not Leak Info ✅

```solidity
event WithdrawalRejectedZero(address indexed user, address indexed recipient, uint256 indexed requestId);
```

**Question:** Does this leak balance info?  
**Answer:** ✅ No!

**Why:**
- Emitted AFTER oracle already decrypted (amount public in callback context)
- Only indicates "this specific request = 0"
- Does NOT reveal current balance (could have deposits after request)
- No more information than oracle already had

### ReentrancyGuard ✅

```solidity
contract ChiperProtocol is SepoliaConfig, ReentrancyGuard {
    function onWithdrawCallback(...) external nonReentrant {
        // CEI pattern + reentrancy protection
    }
}
```

**Protection:**
- `nonReentrant` on callback prevents reentrancy attacks
- CEI pattern: mark `processed = true` before ETH transfer
- Double-spend protection: check `w.processed` at start

---

## 🧪 Testing Checklist

### Contract Tests

- [ ] Test full balance withdrawal (amount = balance) using FHE.or logic
- [ ] Test partial withdrawal (amount < balance)
- [ ] Test over-balance withdrawal (amount > balance) → txAmt = 0
- [ ] Test zero balance withdrawal → WithdrawalRejectedZero event
- [ ] Test oracle callback signature validation
- [ ] Test timeout cancellation (after 6 hours)
- [ ] Test timeout cancellation (before 6 hours) → revert
- [ ] Test MAX_ACTIVE_REQUESTS limit (11th request fails)
- [ ] Test request cleanup via _removeActiveRequest
- [ ] Test ReentrancyGuard on callback
- [ ] Test custom error reverts
- [ ] Test all view functions return correct data

### UI Tests

- [ ] Balance = 0 → Warning shown
- [ ] Balance > 0 → Decrypt and display
- [ ] WithdrawalRequested event → Show in transaction history
- [ ] WithdrawalRejectedZero event → Show rejection message
- [ ] WithdrawalCancelled event → Show cancellation in history
- [ ] Multiple active requests → Display all with status
- [ ] Better error messages for decrypt failures
- [ ] Check timeout status for active requests

---

## 🚀 Deployment Guide

### For Users

**What's New:**
- ✅ Timeout protection: Recover funds after 6 hours
- ✅ Request tracking: View all active withdrawals
- ✅ Better error handling: Clear error messages
- ✅ DoS protection: Max 10 concurrent requests

**What Stays Same:**
- ✅ Deposit flow unchanged
- ✅ Withdrawal encryption unchanged
- ✅ Oracle decryption flow unchanged
- ✅ Balance privacy maintained

### For Developers

**Deployment Steps:**
```bash
# 1. Deploy contract
cd packages/fhevm-hardhat-template
npm run deploy:sepolia

# 2. Verify contract on Etherscan
npm run verify:sepolia

# 3. Generate ABI for frontend
npm run generate:abi

# 4. Test on testnet
# 5. Deploy to mainnet when ready
```

**Key Changes:**
- ⚠️ Event names: `WithdrawXxx` → `WithdrawalXxx`
- ⚠️ New view functions (8+ functions)
- ⚠️ Custom errors instead of require strings

---

## 📚 Technical References

### FHEVM Operations Used

| Function | Operation | Usage |
|----------|-----------|----------|
| `FHE.asEuint128(uint128)` | Convert plaintext to encrypted | Initialize balances, TVL |
| `FHE.fromExternal(...)` | Import encrypted input | Withdrawal amount from UI |
| `FHE.add(a, b)` | Encrypted addition | Deposit, timeout refund |
| `FHE.sub(a, b)` | Encrypted subtraction | Lock withdrawal amount |
| `FHE.lt(a, b)` | a < b (encrypted) | Amount validation |
| `FHE.eq(a, b)` | a == b (encrypted) | Full balance check |
| `FHE.or(a, b)` | Logical OR (encrypted) | Combine lt + eq for ≤ |
| `FHE.select(condition, a, b)` | Conditional select | Cap amount to balance |
| `FHE.allowThis(handle)` | Grant contract access | ACL management |
| `FHE.allow(handle, address)` | Grant user access | Let user decrypt |
| `FHE.makePubliclyDecryptable(handle)` | Public decryption | TVL transparency |
| `FHE.requestDecryption(...)` | Request oracle decrypt | Withdrawal callback |
| `FHE.checkSignatures(...)` | Verify oracle signature | Callback authentication |

**Documentation:**
https://docs.zama.ai/fhevm

### Contract Architecture

**Key Components:**
```solidity
// 1. State
mapping(address => euint128) private _balances;  // User balances (encrypted)
euint128 private _tvl;                           // Total value locked (public decrypt)
mapping(uint256 => PendingWithdrawal) private _pendingWithdrawals;
mapping(address => uint256[]) private _userActiveRequests;

// 2. Constants
uint256 public constant WITHDRAWAL_TIMEOUT = 6 hours;
uint256 public constant MAX_ACTIVE_REQUESTS = 10;
uint256 public constant PROTOCOL_VERSION = 1;

// 3. Security
ReentrancyGuard (nonReentrant on callback)
Custom errors (gas-efficient)
CEI pattern (checks-effects-interactions)
```

---

## ✅ Implementation Checklist

**Contract Features:**
- ✅ PendingWithdrawal struct with full metadata
- ✅ WITHDRAWAL_TIMEOUT constant (6 hours)
- ✅ FHE.or(lt, eq) for ≤ comparison
- ✅ Zero balance handling with event
- ✅ cancelTimedOutWithdrawal function
- ✅ Custom error definitions
- ✅ Multiple view functions (8+)
- ✅ nonReentrant on callback
- ✅ _removeActiveRequest helper

**Frontend Updates:**
- ✅ Event names: WithdrawalRequested, WithdrawalRejected, WithdrawalCancelled
- ✅ Zero balance warnings
- ✅ Better error messages for decrypt failures
- ✅ Transaction history includes all event types

---

