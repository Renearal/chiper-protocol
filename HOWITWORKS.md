# How It Works - Chiper Protocol Confidential Transfer

## 🔐 Overview

Chiper Protocol is a confidential transfer protocol that uses **Fully Homomorphic Encryption (FHE)** from Zama to store and manage ETH with fully encrypted on-chain balances.

**Key Features:**
- ✅ User balance **100% private** (encrypted on-chain)
- ✅ Mathematical operations on encrypted data (without decryption)
- ✅ Withdraw amount **private** during request
- ✅ Balance check **private** (no error leak)
- ✅ TVL transparent for auditing

---

## 1️⃣ DEPOSIT - Store ETH with Encrypted Balance

### Flow Diagram
```
┌─────────┐     ETH      ┌──────────────┐     Encrypt    ┌─────────────┐
│  User   │ ──────────> │   Contract   │ ────────────> │  Encrypted  │
│ Wallet  │             │ depositETH() │               │   Balance   │
└─────────┘             └──────────────┘               └─────────────┘
                              │
                              ├─> Update encrypted balance
                              ├─> Update encrypted TVL
                              └─> Set ACL permissions
```

### Step-by-Step Process

**1. User Initiate Deposit**
```typescript
// Frontend
const amount = ethers.parseEther("0.1"); // 0.1 ETH
await vault.depositETH({ value: amount });
```

**2. Smart Contract Processing**
```solidity
// Contract: PrivateVault.sol (line 31-47)
function depositETH() external payable {
    require(msg.value > 0, "No ETH");
    require(msg.value <= type(uint128).max, "Too large");

    // Convert public ETH amount to encrypted value
    euint128 amt = FHE.asEuint128(uint128(msg.value));
    
    // Add to user's encrypted balance (FHE operation)
    _balances[msg.sender] = FHE.add(_balances[msg.sender], amt);
    
    // Update encrypted TVL
    _tvl = FHE.add(_tvl, amt);

    // Set Access Control List
    FHE.allow(_balances[msg.sender], msg.sender);  // User can decrypt
    FHE.allowThis(_balances[msg.sender]);          // Contract can use
    FHE.allowThis(_tvl);
    
    // Make TVL publicly decryptable (transparency)
    FHE.makePubliclyDecryptable(_tvl);

    emit Deposit(msg.sender, msg.value);
}
```

**3. What Happens**
- ✅ ETH enters contract (public, visible on blockchain)
- ✅ User balance encrypted (private, only user can decrypt)
- ✅ TVL encrypted but publicly decryptable (for transparency)

### Privacy Guarantees

| Data | Visibility | Who Can See |
|------|-----------|-------------|
| Deposit amount | 🔓 Public | Everyone (in transaction) |
| User total balance | 🔐 Private | Only the user |
| TVL (Total Value Locked) | 🔓 Public | Everyone (by design) |

**Example:**
```
Alice deposits 0.1 ETH
Bob deposits 0.5 ETH
Charlie deposits 0.2 ETH

What others see:
- Alice deposited 0.1 ETH ✅
- Bob deposited 0.5 ETH ✅
- Charlie deposited 0.2 ETH ✅
- TVL = 0.8 ETH ✅

What others DON'T see:
- Alice's total balance ❌
- Bob's total balance ❌
- Charlie's total balance ❌
```

---

## 2️⃣ DECRYPT BALANCE - View Private Balance

### Flow Diagram
```
┌─────────┐   Get Handle   ┌──────────────┐   Sign Message   ┌─────────────┐
│  User   │ ────────────> │   Contract   │ ──────────────> │    Zama     │
│ Wallet  │               │ myBalance()  │                 │   Gateway   │
└─────────┘               └──────────────┘                 └─────────────┘
     ▲                           │                                │
     │                           │ Returns                        │
     │                           │ encrypted                      │
     │                           │ handle                         │
     │                           ▼                                │
     │                    ┌──────────────┐                        │
     │                    │   FHEVM SDK  │                        │
     │                    │  userDecrypt │ <──────────────────────┘
     │                    └──────────────┘      Decrypted value
     │                           │
     └───────────────────────────┘
              Display balance
```

### Step-by-Step Process

**1. Get Encrypted Handle**
```typescript
// Frontend
const handle = await vault.myBalance();
// Returns: "0x1234abcd5678ef90..." (encrypted handle)
```

**2. User Authorization (Sign Message)**
```typescript
const sig = await FhevmDecryptionSignature.loadOrSign(
    fhevmInstance,
    [vaultAddress],
    signer,
    storage
);
```

**MetaMask Popup:**
```
┌─────────────────────────────────────┐
│  Sign this message to decrypt       │
│  your balance                       │
│                                     │
│  Domain: Sepolia                    │
│  Contract: 0xF065...                │
│  Purpose: User Decryption           │
│                                     │
│  [Cancel]  [Sign]                   │
└─────────────────────────────────────┘
```

**3. Decrypt via Zama Gateway**
```typescript
const decrypted = await fhevmInstance.userDecrypt(
    [{ handle, contractAddress: vaultAddress }],
    sig.privateKey,
    sig.publicKey,
    sig.signature,
    sig.contractAddresses,
    sig.userAddress,
    sig.startTimestamp,
    sig.durationDays
);

const balanceWei = decrypted[handle]; // "100000000000000000"
const balanceETH = ethers.formatEther(balanceWei); // "0.1"
```

**4. Display in UI**
```
┌─────────────────────────────┐
│  Your Balance               │
│  0.1 ETH                    │
│  (decrypted)                │
└─────────────────────────────┘
```

### Security & Privacy

**Why It's Secure:**
- 🔐 Decryption happens **off-chain** via Zama Gateway
- 🔐 Signature only valid for user with private key
- 🔐 Others cannot decrypt your balance
- 🔐 Decrypted result NOT stored on-chain

**Why It's Private:**
- Balance stored encrypted on-chain
- Only you can decrypt (with your signature)
- No one else can see your total balance
- Even contract owner cannot see balances

---

## 3️⃣ WITHDRAW - Withdraw ETH with Encrypted Amount

### Flow Diagram
```
┌─────────┐  Encrypt Amount  ┌──────────────┐  Request Decrypt  ┌─────────────┐
│  User   │ ──────────────> │   Contract   │ ───────────────> │    Zama     │
│ Wallet  │                 │requestWithdraw│                  │   Oracle    │
└─────────┘                 └──────────────┘                  └─────────────┘
                                   │                                  │
                                   │ 1. Check balance (encrypted)     │
                                   │ 2. Deduct balance (encrypted)    │
                                   │ 3. Request decryption            │
                                   │                                  │
                                   │ <────────────────────────────────┘
                                   │        Callback with
                                   │        decrypted amount
                                   ▼
                            ┌──────────────┐
                            │ onWithdraw() │
                            │ - Verify sig │
                            │ - Send ETH   │
                            └──────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │ Recipient    │
                            │ Receives ETH │
                            └──────────────┘
```

### Step-by-Step Process

**1. User Encrypts Withdrawal Amount**
```typescript
// Frontend
const amount = ethers.parseEther("0.05"); // Want to withdraw 0.05 ETH

// Create encrypted input
const input = fhevmInstance.createEncryptedInput(vaultAddress, userAddress);
input.add128(amount); // Encrypt the amount
const { handles, inputProof } = await input.encrypt();
```

**2. Send Withdraw Request**
```typescript
const tx = await vault.requestWithdraw(
    recipientAddress,  // Where to send ETH
    handles[0],        // Encrypted amount
    inputProof         // Proof that encryption is valid
);
await tx.wait();
```

**3. Contract Processes Request (PRIVATE)**
```solidity
// Contract: PrivateVault.sol (line 54-90)
function requestWithdraw(
    address payable to,
    externalEuint128 extAmt,
    bytes calldata inputProof
) external returns (uint256 requestId) {
    require(to != address(0), "bad to");

    // Get encrypted amount from user
    euint128 amt = FHE.fromExternal(extAmt, inputProof);

    // PRIVATE COMPARISON: if (amt <= balance) txAmt = amt else 0
    // This happens ENCRYPTED - no one knows the result!
    ebool ok = FHE.le(amt, _balances[msg.sender]);
    euint128 txAmt = FHE.select(ok, amt, FHE.asEuint128(0));

    // Deduct from balance (ENCRYPTED)
    _balances[msg.sender] = FHE.sub(_balances[msg.sender], txAmt);
    _tvl = FHE.sub(_tvl, txAmt);

    // Update ACL
    FHE.allow(_balances[msg.sender], msg.sender);
    FHE.allowThis(_balances[msg.sender]);
    FHE.allowThis(_tvl);
    FHE.makePubliclyDecryptable(_tvl);
    FHE.makePubliclyDecryptable(txAmt);

    // Request oracle to decrypt txAmt
    bytes32[] memory cts = new bytes32[](1);
    cts[0] = FHE.toBytes32(txAmt);
    requestId = FHE.requestDecryption(cts, this.onWithdraw.selector);

    // Save pending request
    _pending[requestId] = PendingW({ 
        to: to, 
        from: msg.sender, 
        processed: false 
    });

    emit WithdrawRequested(msg.sender, to, requestId);
}
```

**4. Oracle Decrypts & Calls Back**
```solidity
// Contract: PrivateVault.sol (line 93-114)
function onWithdraw(
    uint256 requestId,
    bytes calldata cleartexts,
    bytes calldata signatures
) external {
    // CRITICAL: Verify oracle signature (anti-spoof)
    FHE.checkSignatures(requestId, cleartexts, signatures);

    PendingW storage p = _pending[requestId];
    require(!p.processed, "already");
    require(p.to != address(0) && p.from != address(0), "no pending");
    p.processed = true;

    // Decode decrypted amount
    uint128 amount = abi.decode(cleartexts, (uint128));
    
    // Check vault has enough balance
    require(address(this).balance >= amount, "insufficient vault balance");
    
    // Send ETH to recipient
    if (amount > 0) {
        (bool ok, ) = p.to.call{ value: uint256(amount) }("");
        require(ok, "ETH send failed");
    }
    
    emit Withdrawn(p.from, p.to, amount);
}
```

**5. ETH Transferred to Recipient**

### Privacy Guarantees

**What's Private:**
- ✅ Withdrawal amount (encrypted during request)
- ✅ Balance check result (no public error if insufficient)
- ✅ Actual transferred amount (only revealed at callback)

**What's Public:**
- 🔓 Withdrawal request event (someone requested withdraw)
- 🔓 Final transfer (ETH moved to recipient)
- 🔓 Recipient address

**Example Scenario:**

```
Alice has 1.0 ETH balance (encrypted, private)
Alice requests withdraw 0.5 ETH (encrypted)

What blockchain observers see:
- WithdrawRequested event ✅
- Request ID: 12345 ✅
- Recipient: 0xBob... ✅
- Amount: ??? ❌ (encrypted!)

Later, oracle processes:
- Withdrawn event ✅
- Amount: 0.5 ETH ✅ (now public)
- ETH transfer to Bob ✅

What if Alice tried to withdraw 2.0 ETH (more than balance)?
- Request still succeeds ✅
- No error message ✅
- txAmt = 0 (privately) ✅
- Oracle decrypts 0 ✅
- No ETH transferred ✅
- No one knows Alice tried to withdraw more than she has! 🔐
```

### Security Features

**1. Balance Check (Private)**
```solidity
// This comparison happens ENCRYPTED
ebool ok = FHE.le(amt, _balances[msg.sender]);
euint128 txAmt = FHE.select(ok, amt, FHE.asEuint128(0));
// If insufficient balance, txAmt = 0 (privately, no error!)
```

**2. Oracle Signature Verification**
```solidity
// Prevents spoofed callbacks
FHE.checkSignatures(requestId, cleartexts, signatures);
```

**3. Vault Balance Check**
```solidity
// Ensures contract has enough ETH
require(address(this).balance >= amount, "insufficient vault balance");
```

**4. Reentrancy Protection**
```solidity
// Prevents double-processing
require(!p.processed, "already");
p.processed = true;
```

---

## 🔑 Core Concepts

### Fully Homomorphic Encryption (FHE)

FHE allows computations on encrypted data without decryption:

```solidity
// All these operations work on ENCRYPTED data!
euint128 sum = FHE.add(encrypted_a, encrypted_b);      // Addition
euint128 diff = FHE.sub(encrypted_a, encrypted_b);     // Subtraction
ebool result = FHE.le(encrypted_a, encrypted_b);       // Comparison (<=)
euint128 selected = FHE.select(condition, a, b);       // Conditional select
```

**Magic of FHE:**
- Input: Encrypted ✅
- Operation: On encrypted data ✅
- Output: Still encrypted ✅
- No decryption needed! ✅

### Zama Decryption Oracle

**Address (Sepolia):** `0xa02Cda4Ca3a71D7C46997716F4283aa851C28812`

**Purpose:**
- Decrypt encrypted values when needed (withdraw)
- Provide cryptographic proof (signature)
- Ensure decryption is legitimate

**How It Works:**
1. Contract calls `FHE.requestDecryption()`
2. Oracle monitors blockchain for requests
3. Oracle decrypts the value
4. Oracle calls back with result + signature
5. Contract verifies signature before using result

### Access Control List (ACL)

Controls who can decrypt or use encrypted values:

```solidity
// User can decrypt their own balance
FHE.allow(_balances[msg.sender], msg.sender);

// Contract can use balance in computations
FHE.allowThis(_balances[msg.sender]);

// Anyone can decrypt TVL (transparency)
FHE.makePubliclyDecryptable(_tvl);
```

---

## 📊 Comparison: Traditional vs Confidential Transfer

| Feature | Traditional Transfer | Chiper Protocol (FHE) |
|---------|------------------|----------------------|
| **Deposit Amount** | 🔓 Public | 🔓 Public (in tx) |
| **User Balance** | 🔓 Public | 🔐 **Private** (encrypted) |
| **Withdraw Amount** | 🔓 Public | 🔐 **Private** (during request) |
| **Balance Check** | 🔓 Public error | 🔐 **Private** (no error leak) |
| **Insufficient Balance** | ❌ Reverts with error | ✅ Silent fail (txAmt=0) |
| **TVL** | 🔓 Public | 🔓 Public (by design) |
| **Privacy** | ❌ None | ✅ **Full balance privacy** |
| **Auditability** | ✅ Full | ✅ TVL auditable |

---

## 🛡️ Security Considerations

### What's Protected
- ✅ User balance amounts (encrypted on-chain)
- ✅ Withdrawal amounts (encrypted during request)
- ✅ Balance check results (no error leakage)
- ✅ Transaction patterns (no failed withdraw errors)

### What's Not Protected
- 🔓 Deposit amounts (visible in transaction)
- 🔓 Deposit frequency (visible on-chain)
- 🔓 Final withdrawal amounts (revealed at callback)
- 🔓 Recipient addresses (public)

### Attack Vectors & Mitigations

**1. Oracle Spoofing**
- ❌ Attack: Fake oracle sends false decryption
- ✅ Mitigation: `FHE.checkSignatures()` verifies oracle

**2. Reentrancy**
- ❌ Attack: Recursive callback calls
- ✅ Mitigation: `processed` flag prevents double-processing

**3. Balance Manipulation**
- ❌ Attack: Withdraw more than balance
- ✅ Mitigation: FHE comparison ensures `txAmt = 0` if insufficient

**4. Front-running**
- ❌ Attack: MEV bot sees withdraw and front-runs
- ✅ Mitigation: Amount encrypted, bot doesn't know value

---

## 🚀 Performance & Gas Costs

### Estimated Gas Costs (Sepolia)

| Operation | Gas Used | Cost @ 50 gwei |
|-----------|----------|----------------|
| Deposit | ~150,000 | ~0.0075 ETH |
| Request Withdraw | ~200,000 | ~0.01 ETH |
| Oracle Callback | ~100,000 | ~0.005 ETH (paid by oracle) |
| Decrypt Balance | Off-chain | Free |

**Note:** FHE operations are more expensive than regular operations due to cryptographic overhead.

---

## 📚 Technical Stack

- **Smart Contract:** Solidity 0.8.24
- **FHE Library:** Zama fhEVM
- **Network:** Sepolia Testnet
- **Oracle:** Zama Decryption Oracle
- **Frontend:** Next.js 15 + TypeScript
- **Web3:** ethers.js v6

---

## 🔗 Contract Address

**Sepolia Testnet:**
```
0x4d203c455E9D502C9a384361dAE30AE3d325953f
```

**Verify on Etherscan:**
https://sepolia.etherscan.io/address/0x4d203c455E9D502C9a384361dAE30AE3d325953f

---

## 💡 Use Cases

1. **Private Savings Account**
   - Keep balance private from public
   - Withdraw without revealing total holdings

2. **Anonymous Donations**
   - Donors can keep balance private
   - Recipients see donations but not donor balance

3. **Private Payroll**
   - Company deposits salaries
   - Employee balances remain private

4. **Confidential Trading**
   - Keep trading capital private
   - Execute trades without revealing total funds

---

## 🎯 Future Improvements

- [ ] Multi-token support (ERC20)
- [ ] Batch withdrawals
- [ ] Scheduled withdrawals
- [ ] Private transfers between users
- [ ] Interest-bearing deposits
- [ ] Governance with private voting

---

**Powered by Zama fhEVM | Built by Chiper Protocol**

