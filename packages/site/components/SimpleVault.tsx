"use client";

import { useFhevm } from "@fhevm/react";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useWalletEthersSigner } from "../hooks/wallet/useWalletEthersSigner";
import { usePrivateVault } from "../hooks/usePrivateVault";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

export const SimpleVault = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    isConnected,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useWalletEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const vault = usePrivateVault({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  // States
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [walletBalance, setWalletBalance] = useState("0");
  const [status, setStatus] = useState<{ type: "info" | "success" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (ethersSigner) {
        try {
          const address = await ethersSigner.getAddress();
          const balance = await ethersSigner.provider.getBalance(address);
          setWalletBalance(ethers.formatEther(balance));
        } catch (e) {
          console.error("Failed to fetch balance:", e);
        }
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [ethersSigner]);

  // Auto-fill withdraw address
  useEffect(() => {
    const setAddress = async () => {
      if (ethersSigner && !withdrawTo) {
        const addr = await ethersSigner.getAddress();
        setWithdrawTo(addr);
      }
    };
    setAddress();
  }, [ethersSigner, withdrawTo]);

  const showStatus = (type: "info" | "success" | "error", message: string) => {
    setStatus({ type, message });
    if (type !== "info") {
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    setIsLoading(true);
    showStatus("info", "Processing deposit...");

    try {
      const amount = ethers.parseEther(depositAmount);
      await vault.deposit(amount);
      showStatus("success", `Deposited ${depositAmount} ETH successfully!`);
      setDepositAmount("");
    } catch (e: unknown) {
      const error = e as { code?: string; message?: string };
      if (error?.code === "ACTION_REJECTED") {
        showStatus("error", "Transaction cancelled");
      } else {
        showStatus("error", error?.message || "Deposit failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawTo || parseFloat(withdrawAmount) <= 0) return;
    if (!fhevmInstance || !vault.vault.address || !ethersSigner) {
      showStatus("error", "Wallet not ready");
      return;
    }

    setIsLoading(true);
    showStatus("info", "Encrypting and submitting withdrawal...");

    try {
      const amount = ethers.parseEther(withdrawAmount);
      const userAddress = await ethersSigner.getAddress();

      // Create encrypted input
      const input = fhevmInstance.createEncryptedInput(vault.vault.address, userAddress);
      input.add128(amount);
      const encryptedInput = await input.encrypt();

      // Submit to contract
      const vaultContract = new ethers.Contract(
        vault.vault.address,
        vault.vault.abi,
        ethersSigner
      );

      const tx = await vaultContract.requestWithdraw(
        withdrawTo,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      showStatus("success", "Withdrawal requested! Oracle processing (~20s)");
      setWithdrawAmount("");

      setTimeout(() => vault.refreshBalanceHandle(), 3000);
    } catch (e: unknown) {
      const error = e as { code?: string; message?: string };
      if (error?.code === "ACTION_REJECTED") {
        showStatus("error", "Transaction cancelled");
      } else {
        showStatus("error", error?.message || "Withdrawal failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = () => {
    if (vault.clearBalance) {
      return ethers.formatEther(BigInt(vault.clearBalance.clear.toString()));
    }
    return "---";
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-gray-900">Chiper Protocol</h1>
        <p className="text-gray-500 mt-1">FHE-Encrypted ETH Storage</p>
        <p className="text-xs text-gray-400 mt-2">Powered by Zama fhEVM</p>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-yellow-800 font-medium">Connect your wallet to continue</p>
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div className={`rounded-xl p-4 ${
          status.type === "success" ? "bg-green-50 border border-green-200 text-green-800" :
          status.type === "error" ? "bg-red-50 border border-red-200 text-red-800" :
          "bg-blue-50 border border-blue-200 text-blue-800"
        }`}>
          <p className="font-medium">{status.message}</p>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
        <p className="text-gray-400 text-sm mb-1">Vault Balance</p>

        {vault.isDecrypted ? (
          <p className="text-4xl font-bold">{formatBalance()} ETH</p>
        ) : (
          <div className="space-y-3">
            <p className="text-2xl font-mono text-gray-400">
              {vault.balanceHandle ? "Encrypted" : "No balance"}
            </p>
            <button
              onClick={() => vault.decryptBalance()}
              disabled={!vault.canDecrypt || vault.isDecrypting}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm
                hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {vault.isDecrypting ? "Decrypting..." : "Decrypt Balance"}
            </button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-xs">Wallet: {parseFloat(walletBalance).toFixed(4)} ETH</p>
        </div>
      </div>

      {/* Deposit Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Deposit ETH</h2>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Amount (ETH)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2
              focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2">
          {["0.01", "0.05", "0.1", "0.5"].map((amt) => (
            <button
              key={amt}
              onClick={() => setDepositAmount(amt)}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium
                hover:bg-gray-50 transition"
            >
              {amt}
            </button>
          ))}
        </div>

        <button
          onClick={handleDeposit}
          disabled={!isConnected || !vault.isDeployed || !depositAmount || isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold
            hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isLoading ? "Processing..." : "Deposit"}
        </button>
      </div>

      {/* Withdraw Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Withdraw ETH</h2>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Amount (ETH)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2
              focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">To Address</label>
          <input
            type="text"
            placeholder="0x..."
            value={withdrawTo}
            onChange={(e) => setWithdrawTo(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm
              focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!isConnected || !vault.isDeployed || !withdrawAmount || !withdrawTo || isLoading}
          className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold
            hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isLoading ? "Processing..." : "Withdraw"}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Withdrawals are processed by Zama oracle (~20 seconds)
        </p>
      </div>

      {/* Info Footer */}
      <div className="text-center space-y-2 pb-4">
        <p className="text-xs text-gray-400">
          Contract: {vault.vault.address?.slice(0, 10)}...{vault.vault.address?.slice(-8)}
        </p>
        <p className="text-xs text-gray-400">
          Network: Sepolia | FHEVM: {fhevmStatus}
        </p>
      </div>
    </div>
  );
};
