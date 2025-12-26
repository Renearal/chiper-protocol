# Private Vault - FHE Encrypted ETH Storage

A privacy-preserving ETH vault powered by Zama's Fully Homomorphic Encryption (fhEVM). Store and manage ETH with encrypted balances on-chain.

## Tech Stack

| Component | Version |
|-----------|---------|
| @fhevm/solidity | 0.9.1 |
| @zama-fhe/relayer-sdk | 0.3.0-8 |
| @fhevm/hardhat-plugin | 0.3.0-2 |
| Network Config | ZamaEthereumConfig |
| Solidity | 0.8.24+ |
| Next.js | 15.x |
| React | 19.x |

---

### Smart Contract (Sepolia Testnet)
**[0x6ab18D978B3B54535DD5c8EeE372CBCdC20812b5](https://sepolia.etherscan.io/address/0x6ab18D978B3B54535DD5c8EeE372CBCdC20812b5)**

### Live Demo
**[https://chiper-protocol-review.vercel.app/](https://chiper-protocol-review.vercel.app/)**

---

## 🔐 Features

- **🔒 Encrypted Balance**: Balance stored encrypted on-chain using FHEVM (euint128)
- **💰 Private Deposits**: Deposit ETH with encrypted balance tracking
- **🚀 Private Withdrawals**: Withdraw with encrypted amount + oracle decryption
- **👁️ User Decryption**: Decrypt your balance with EIP-712 signature
- **📊 TVL Transparency**: Total Value Locked publicly auditable
- **✨ Modern UI**: Beautiful animations with progress indicators
- **🎨 Minimalist Design**: Clean, responsive interface
- **⚡ Next.js 15 + React 19**: Modern stack with TypeScript

> **⏱️ Note:** Withdrawals take 5-10 minutes due to oracle decryption process. This is normal for FHE-based private transactions. [Learn why →](./WITHDRAWAL_EXPLAINED.md)

## 📖 How It Works

**Want to understand the magic behind private balances?**

👉 **[Read the Complete Guide: HOWITWORKS.md](./HOWITWORKS.md)**

This comprehensive guide explains:
- 🔐 **How Deposit Works** - ETH in, encrypted balance out
- 👁️ **How Decrypt Balance Works** - View your private balance
- 💸 **How Withdraw Works** - Private withdrawal with oracle decryption
- 🔑 **Core Concepts** - FHE, Oracle, ACL explained
- 🛡️ **Security Features** - What's protected and how
- 📊 **Comparison** - Traditional vs Confidential Transfer

### Quick Overview

```
┌─────────────┐     Deposit      ┌──────────────┐
│    User     │ ───────────────> │   Contract   │
│   Wallet    │   (Public ETH)   │ (Encrypted   │
└─────────────┘                  │  Balance)    │
      │                          └──────────────┘
      │ Decrypt                         │
      │ (Private)                       │ Withdraw
      ▼                                 ▼ (Private)
┌─────────────┐                  ┌──────────────┐
│  View       │                  │    Oracle    │
│  Balance    │                  │  Decryption  │
└─────────────┘                  └──────────────┘
```

**Key Privacy Features:**
- ✅ Your balance is **encrypted on-chain** (euint128)
- ✅ Withdraw amount is **encrypted** during request
- ✅ Balance checks happen **privately** (no error leaks)
- ✅ Only you can decrypt your balance
- ✅ TVL remains transparent for auditing

## Requirements

- You need to have Metamask browser extension installed on your browser.

## Local Hardhat Network (to add in MetaMask)

Follow the step-by-step guide in the [Hardhat + MetaMask](https://docs.metamask.io/wallet/how-to/run-devnet/) documentation to set up your local devnet using Hardhat and MetaMask.

- Name: Hardhat
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency symbol: ETH

## Install

1. Clone this repository.
2. From the repo root, run:

```sh
npm install
```

## Quickstart

1. Setup your hardhat environment variables:

Follow the detailed instructions in the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) to setup `MNEMONIC` + `INFURA_API_KEY` Hardhat environment variables

2. Start a local Hardhat node (new terminal):

```sh
# Default RPC: http://127.0.0.1:8545  | chainId: 31337
npm run hardhat-node
```

3. Launch the frontend in mock mode:

```sh
npm run dev:mock
```

4. Start your browser with the Metamask extension installed and open http://localhost:3000

5. Open the Metamask extension to connect to the local Hardhat node
   i. Select Add network.
   ii. Select Add a network manually.
   iii. Enter your Hardhat Network RPC URL, http://127.0.0.1:8545 (or http://localhost:8545).
   iv. Enter your Hardhat Network chain ID, 31337 (or 0x539 in hexadecimal format).

## Run on Sepolia

### Deploy Your Own

1. Deploy your contract on Sepolia Testnet

```sh
npm run deploy:sepolia
```

2. Verify contract on Etherscan (optional but recommended)

```sh
npm run verify:sepolia
```

See [VERIFY_CONTRACT.md](./VERIFY_CONTRACT.md) for detailed verification guide.

3. In your browser open `http://localhost:3000`

4. Open the Metamask extension to connect to the Sepolia network

## How to fix Hardhat Node + Metamask Errors ?

When using MetaMask as a wallet provider with a development node like Hardhat, you may encounter two common types of errors:

### 1. ⚠️ Nonce Mismatch ❌💥

MetaMask tracks wallet nonces (the number of transactions sent from a wallet). However, if you restart your Hardhat node, the nonce is reset on the dev node, but MetaMask does not update its internal nonce tracking. This discrepancy causes a nonce mismatch error.

### 2. ⚠️ View Function Call Result Mismatch ❌💥

MetaMask caches the results of view function calls. If you restart your Hardhat node, MetaMask may return outdated cached data corresponding to a previous instance of the node, leading to incorrect results.

### ✅ How to Fix Nonce Mismatch:

To fix the nonce mismatch error, simply clear the MetaMask cache:

1. Open the MetaMask browser extension.
2. Select the Hardhat network.
3. Go to Settings > Advanced.
4. Click the "Clear Activity Tab" red button to reset the nonce tracking.

The correct way to do this is also explained [here](https://docs.metamask.io/wallet/how-to/run-devnet/).

### ✅ How to Fix View Function Return Value Mismatch:

To fix the view function result mismatch:

1. Restart the entire browser. MetaMask stores its cache in the extension's memory, which cannot be cleared by simply clearing the browser cache or using MetaMask's built-in cache cleaning options.

By following these steps, you can ensure that MetaMask syncs correctly with your Hardhat node and avoid potential issues related to nonces and cached view function results.

## Project Structure Overview

### Smart Contracts

- **`packages/fhevm-hardhat-template/contracts/PrivateVault.sol`**: Main vault contract with encrypted balance storage
- **`packages/fhevm-hardhat-template/contracts/MockERC20.sol`**: Mock token for testing (mUSDT)
- **`packages/fhevm-hardhat-template/deploy/deployPrivateVault.ts`**: Deployment script

### Frontend

- **`packages/site/hooks/usePrivateVault.tsx`**: Custom hook to interact with PrivateVault contract
- **`packages/site/components/PrivateVaultDemo.tsx`**: Main UI component with deposit/withdraw forms
- **`packages/site/app/page.tsx`**: Homepage that renders PrivateVaultDemo
- **`packages/site/hooks/metamask`**: MetaMask wallet provider hooks

### Key Concepts

1. **Encrypted Input**: User input is encrypted client-side with `createEncryptedInput()` before sending on-chain
2. **User Decryption**: Balance handle is decrypted with EIP-712 auth token scoped to specific contracts
3. **Oracle Decryption**: Withdraw uses public decryption via oracle callback with KMS signatures
4. **ACL Management**: Access control for encrypted values with `FHE.allow()`, `FHE.allowThis()`

## 📚 Documentation

### Core Documentation
- **[HOWITWORKS.md](./HOWITWORKS.md)** - Complete guide on how deposit, decrypt, and withdraw work
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide and troubleshooting
- **[UI_IMPROVEMENTS.md](./UI_IMPROVEMENTS.md)** - UI/UX features and animations

### External Resources

- [Hardhat + MetaMask](https://docs.metamask.io/wallet/how-to/run-devnet/): Set up your local devnet step by step using Hardhat and MetaMask.
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/)
- [FHEVM Hardhat](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [@zama-fhe/relayer-sdk Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/)
- [Setting up MNEMONIC and INFURA_API_KEY](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional)
- [React Documentation](https://reactjs.org/)
- [FHEVM Discord Community](https://discord.com/invite/zama)
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues)

## License

MIT
