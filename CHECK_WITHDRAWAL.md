# Check Withdrawal Status

## 🔍 Your Pending Withdrawal

**Contract Address:** `0x4d203c455E9D502C9a384361dAE30AE3d325953f`

---

## Method 1: Check via Etherscan (Fastest)

### Step 1: Open Contract Events
https://sepolia.etherscan.io/address/0x4d203c455E9D502C9a384361dAE30AE3d325953f#events

### Step 2: Find Your WithdrawRequested Event

Look for:
- **Event:** `WithdrawRequested`
- **Topics[1] (user):** Your wallet address
- **Topics[2] (to):** Destination address
- **Data:** `requestId`

### Step 3: Check if Withdrawn Event Exists

Look for:
- **Event:** `Withdrawn`
- **With same requestId**

**Status:**
- ✅ **Found `Withdrawn`** → ETH already sent!
- ⏳ **Not found** → Still waiting for oracle

---

## Method 2: Check Contract Direct

### Read Contract on Etherscan

1. Go to: https://sepolia.etherscan.io/address/0x4d203c455E9D502C9a384361dAE30AE3d325953f#readContract

2. **Check TVL (Total Value Locked):**
   - Find function `9` or search `tvl()`
   - Click "Query"
   - If your withdraw processed, TVL should decrease

3. **Check Your Balance:**
   - Function `myBalance()`
   - Connect your wallet
   - Click "Query"
   - Returns encrypted handle (should be different from before)

---

## Method 3: Check Transaction History

### Your Wallet on Etherscan

1. Open: https://sepolia.etherscan.io/address/YOUR_WALLET_ADDRESS

2. **Check Internal Transactions:**
   - Look for incoming ETH from `0x4d203c455E9D502C9a384361dAE30AE3d325953f`
   - If found → Withdrawal successful! ✅

3. **Check Recent Transactions:**
   - Look for your `requestWithdraw` transaction
   - Click on it → See transaction details
   - Check "Logs" tab for events

---

## ⏱️ Oracle Processing Time

**Normal Processing:**
- Average: 5-10 minutes
- Maximum: 15 minutes

**If > 15 minutes:**
1. Check if transaction failed
2. Check Sepolia network status
3. Try refreshing Etherscan page

---

## 🚨 Troubleshooting

### "No ETH received after 30 minutes"

**Possible causes:**
1. **Insufficient vault balance** → txAmt = 0 (silent fail by design)
2. **Oracle service down** → Check Zama status
3. **Network congestion** → Wait longer

**To verify:**
```
1. Check your balance before withdraw (decrypt)
2. If balance < withdraw amount → txAmt = 0
3. Transaction succeeds but no ETH sent
```

### "How to check if oracle processed?"

Look for these events in order:
1. ✅ `WithdrawRequested` (user action)
2. ⏳ Oracle processing... (off-chain)
3. ✅ `Withdrawn` (oracle callback)

### "Balance decreased but no ETH"

This is **NORMAL** during oracle processing:
- Balance already deducted (encrypted)
- ETH still in vault
- Waiting for oracle to call `onWithdraw()`
- Once oracle calls callback → ETH transferred

---

## 📝 Example Timeline

```
00:00 - User clicks "Withdraw 0.01 ETH"
00:01 - Transaction confirmed ✅
00:02 - Event: WithdrawRequested(requestId=123) ✅
00:03 - Balance handle changed ✅
00:04 - Oracle detecting request... ⏳
00:05 - Oracle decrypting amount... ⏳
00:06 - Oracle calling onWithdraw()... ⏳
00:07 - Event: Withdrawn(amount=10000000000000000) ✅
00:08 - ETH transferred to wallet ✅
00:09 - User sees ETH in MetaMask ✅
```

**Total time: ~5-10 minutes**

---

## 🔗 Quick Links

**Contract Events:**
https://sepolia.etherscan.io/address/0x4d203c455E9D502C9a384361dAE30AE3d325953f#events

**Read Contract:**
https://sepolia.etherscan.io/address/0x4d203c455E9D502C9a384361dAE30AE3d325953f#readContract

**Your Wallet (replace with yours):**
https://sepolia.etherscan.io/address/YOUR_ADDRESS

**Zama Discord (Support):**
https://discord.com/invite/zama

---

## ✅ Summary

**Your withdrawal is PROCESSING**, not stuck!

1. ✅ Request sent
2. ⏳ Oracle decrypting amount
3. ⏳ Waiting for callback
4. ⏳ ETH will arrive in 5-10 minutes

**Be patient - this is how FHE private withdrawals work!** 🚀

