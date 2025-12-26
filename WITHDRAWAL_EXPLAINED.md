# Why Withdrawal Takes 5-10 Minutes? 🕐

## 🎯 TL;DR

**Your ETH is NOT stuck!** Withdrawal is PROCESSING.

FHE (Fully Homomorphic Encryption) withdrawals need oracle decryption, which takes **5-10 minutes**. This is NORMAL and by design for privacy.

---

## 📊 What Happened to Your Withdrawal

### ✅ Step 1: Request Sent (DONE - 0:01)
```
You: "Withdraw 0.01 ETH"
→ Transaction confirmed ✅
→ Event: WithdrawRequested ✅
→ Balance deducted (encrypted) ✅
```

### ⏳ Step 2: Oracle Processing (IN PROGRESS - 0:02 to 0:10)
```
Oracle: Detecting your withdrawal request...
Oracle: Decrypting encrypted amount...
Oracle: Signing decryption result...
Oracle: Calling contract callback...
```

**This is where you are now! ⬆️**

### ⏳ Step 3: ETH Transfer (WAITING - 0:10+)
```
Contract: Verifying oracle signature...
Contract: Transferring ETH to your wallet...
You: Receiving ETH in MetaMask ✅
```

---

## 🔍 Why So Slow?

### Traditional Withdrawal (Public Amount)
```
Time: ~30 seconds
Flow: User → Contract → Instant transfer
Privacy: ❌ Amount visible to everyone
```

### FHE Withdrawal (Private Amount)
```
Time: ~5-10 minutes
Flow: User → Contract → Oracle decrypt → Transfer
Privacy: ✅ Amount hidden until final transfer
```

**Trade-off:** Privacy requires oracle decryption = Slower but private!

---

## 🛡️ Security: Why Oracle is Trusted?

Oracle is run by **Zama** (creators of FHEVM):
1. ✅ Oracle cannot fake decryption (cryptographic proof)
2. ✅ Oracle cannot see your balance (only specific request)
3. ✅ Oracle cannot steal funds (only contract can transfer)
4. ✅ Decryption verified on-chain (FHE.checkSignatures)

---

## 📍 How to Check Status

### Method 1: Etherscan Events (Most Reliable)

**Step 1:** Open Events Tab
```
https://sepolia.etherscan.io/address/0x4d203c455E9D502C9a384361dAE30AE3d325953f#events
```

**Step 2:** Find Your Events

Look for these in order:
1. ✅ `WithdrawRequested` - Your wallet address in topics
2. ⏳ Waiting... (oracle working off-chain)
3. ✅ `Withdrawn` - Same requestId → **ETH sent!**

**If you see `Withdrawn` event → Check your wallet, ETH should be there!**

### Method 2: Your Wallet Balance

**Check MetaMask:**
```
1. Open MetaMask
2. Check ETH balance
3. If increased → Withdrawal complete! ✅
```

**Check Etherscan:**
```
https://sepolia.etherscan.io/address/YOUR_WALLET_ADDRESS
```
Look for "Internal Transactions" from vault contract.

### Method 3: Frontend UI

After UI refresh (made changes):
- Yellow box = Oracle processing ⏳
- Green box = Complete ✅
- Red box = Error ❌
- Link to Etherscan events for tracking

---

## ⏱️ Timeline Breakdown

| Time | What's Happening | Status |
|------|------------------|--------|
| 00:00 | You click "Withdraw" | ⏳ |
| 00:01 | Transaction confirmed on-chain | ✅ |
| 00:02 | Balance deducted (encrypted) | ✅ |
| 00:03 | Event `WithdrawRequested` emitted | ✅ |
| 00:04 | Oracle detects event | ⏳ |
| 00:05-00:08 | Oracle decrypts amount (FHE computation) | ⏳ |
| 00:09 | Oracle calls `onWithdraw()` callback | ⏳ |
| 00:10 | Event `Withdrawn` emitted | ✅ |
| 00:11 | ETH transferred to your wallet | ✅ |
| 00:12 | You see ETH in MetaMask | 🎉 |

**Total: 5-10 minutes** (sometimes up to 15 minutes on testnet)

---

## 🚨 When to Worry?

### ✅ NORMAL (Don't Worry)

- ⏳ Waiting 1-10 minutes → Normal
- ⏳ Balance deducted but no ETH → Normal (oracle processing)
- ⏳ `WithdrawRequested` event exists → Normal (waiting for callback)

### ⚠️ INVESTIGATE (After 15+ minutes)

- ⚠️ No `Withdrawn` event after 15 min → Check network status
- ⚠️ Transaction failed → Check error message
- ⚠️ Insufficient balance → txAmt = 0 (silent fail by design)

### ❌ ERROR (Action Needed)

- ❌ Transaction reverted → Check error on Etherscan
- ❌ Wrong network → Switch to Sepolia
- ❌ Wallet disconnected → Reconnect MetaMask

---

## 💡 Pro Tips

### Tip 1: Check Balance Before Withdraw
```
1. Click "Decrypt Balance"
2. See encrypted balance
3. Withdraw amount ≤ balance
4. If amount > balance → txAmt = 0 (no ETH sent)
```

### Tip 2: Save Transaction Hash
```
After clicking withdraw:
→ Copy transaction hash from MetaMask
→ Track on Etherscan: 
   https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

### Tip 3: Don't Spam Withdraw
```
❌ Clicking withdraw multiple times = Multiple pending requests
✅ Wait for first withdrawal to complete
✅ Check events on Etherscan
```

### Tip 4: Bookmark Event Page
```
https://sepolia.etherscan.io/address/0x4d203c455E9D502C9a384361dAE30AE3d325953f#events

→ Refresh every minute
→ Look for "Withdrawn" event
→ If found = ETH sent! ✅
```

---

## 🎓 Understanding the Tech

### Why Encrypted Amount?

**Problem with Public Amount:**
```
Withdraw 0.01 ETH
→ Everyone sees: "User withdrew 0.01 ETH"
→ Balance calculation: NewBalance = OldBalance - 0.01
→ No privacy! ❌
```

**Solution with FHE:**
```
Withdraw encrypted_amount
→ Everyone sees: "User withdrew ???"
→ Balance: encrypted - encrypted = encrypted
→ Full privacy! ✅
```

### Why Oracle Needed?

**To send actual ETH, contract needs clear amount:**
```
1. User submits: encrypted_amount
2. Balance updated: encrypted - encrypted ✅
3. Transfer ETH: Need clear value! ❌
4. Oracle decrypts: encrypted_amount → 0.01 ETH
5. Contract transfers: 0.01 ETH ✅
```

**Oracle is the bridge from encrypted world to real world!**

---

## 📚 Related Docs

- [HOWITWORKS.md](./HOWITWORKS.md) - Complete technical explanation
- [CHECK_WITHDRAWAL.md](./CHECK_WITHDRAWAL.md) - Step-by-step tracking guide
- [README.md](./README.md) - Project overview

---

## 🆘 Still Have Issues?

### Check These First:
1. ✅ Etherscan events page
2. ✅ Your wallet balance
3. ✅ Transaction hash on Etherscan
4. ✅ Network status (Sepolia up?)

### Get Help:
- 💬 Zama Discord: https://discord.com/invite/zama
- 📧 GitHub Issues: https://github.com/ironhex21/Chiper-Protocol/issues
- 📖 Zama Docs: https://docs.zama.ai/fhevm

---

**Remember: Patience is key! Your withdrawal is processing, not stuck.** ⏳→✅

