"use client";

import { useFhevm } from "@fhevm/react";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useWalletEthersSigner } from "../hooks/wallet/useWalletEthersSigner";
import { usePrivateVault } from "../hooks/usePrivateVault";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

// Loading Spinner Component
const LoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  }[size];

  return (
    <div className={`${sizeClass} relative`}>
      <div className="absolute inset-0 border-4 border-white/30 rounded-full animate-spin border-t-white"></div>
    </div>
  );
};

// Toast Notification Component
const Toast = ({ 
  message, 
  type = "info", 
  onClose 
}: { 
  message: string; 
  type?: "success" | "error" | "info" | "warning";
  onClose: () => void;
}) => {
  const bgColors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500"
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠"
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-slideIn`}>
      <span className="text-2xl">{icons[type]}</span>
      <p className="font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto text-white/80 hover:text-white">
        ✕
      </button>
    </div>
  );
};

// Progress Steps Component
const ProgressSteps = ({ 
  steps, 
  currentStep 
}: { 
  steps: string[]; 
  currentStep: number;
}) => {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            index < currentStep 
              ? "bg-green-500 text-white scale-110" 
              : index === currentStep
              ? "bg-blue-500 text-white animate-pulse"
              : "bg-gray-300 text-gray-500"
          }`}>
            {index < currentStep ? "✓" : index + 1}
          </div>
          <span className={`text-sm ${
            index <= currentStep ? "text-gray-800 font-medium" : "text-gray-400"
          }`}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
};

// Withdrawal Progress Modal Component
const WithdrawalProgressModal = ({
  isOpen,
  currentStep,
  onClose,
}: {
  isOpen: boolean;
  currentStep: number;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      title: "Encrypting Amount",
      description: "Using FHE (Fully Homomorphic Encryption) to encrypt withdrawal amount",
      duration: "~5 seconds"
    },
    {
      title: "Submitting Request",
      description: "Sending encrypted withdrawal request to smart contract",
      duration: "~10 seconds"
    },
    {
      title: "Oracle Processing",
      description: "Zama's oracle is decrypting your encrypted amount using FHE",
      duration: "~16 seconds"
    },
    {
      title: "ETH Transfer",
      description: "Sending ETH to your specified address",
      duration: "~4 seconds"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-4 animate-scaleIn relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Header */}
        <div className="mb-4 pr-6">
          <h3 className="text-base font-bold text-gray-900 text-center">Withdrawal Progress</h3>
          <p className="text-[10px] text-gray-500 text-center mt-1">Please wait while your withdrawal is being processed</p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={index}
                className={`relative border-2 rounded-lg p-3 transition-all duration-300 ${
                  isCompleted
                    ? "border-gray-300 bg-white"
                    : isCurrent
                    ? "border-yellow-400 bg-yellow-50 shadow-md"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {/* Step Icon */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isCompleted
                        ? "bg-gray-700 text-white"
                        : isCurrent
                        ? "bg-yellow-500 text-white animate-pulse"
                        : "bg-gray-300 text-gray-500"
                    }`}
                  >
                    {isCompleted ? (
                      <span className="text-sm">✓</span>
                    ) : isCurrent ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <h4
                      className={`font-bold text-xs mb-1 ${
                        isPending ? "text-gray-500" : "text-gray-900"
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p
                      className={`text-[10px] mb-1.5 ${
                        isPending ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {step.description}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${
                        isPending
                          ? "text-gray-400"
                          : isCurrent
                          ? "text-yellow-600"
                          : "text-gray-600"
                      }`}
                    >
                      {isCurrent ? `⏱ ${step.duration}` : step.duration}
                    </p>
                  </div>
                </div>

                {/* Special message for oracle step */}
                {isCurrent && index === 2 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-[10px] text-gray-700 font-medium">
                      💡 <strong>Why it takes time:</strong> The oracle needs to decrypt your encrypted balance using Fully Homomorphic Encryption (FHE) to verify the withdrawal amount without exposing your data. This typically takes around 16 seconds.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        {currentStep < 3 && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] text-gray-700">
              <strong>⚠️ Please wait:</strong> Do not close this window or refresh the page. The process is running on the blockchain.
            </p>
          </div>
        )}

        {currentStep >= 3 && (
          <div className="mt-2">
            <button
              onClick={onClose}
              className="w-full py-2 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600 transition-all">
              ✓ Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to safely extract error message
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  
  // Handle ethers.js CALL_EXCEPTION
  if (error?.code === 'CALL_EXCEPTION') {
    if (error?.reason) return error.reason;
    if (error?.message?.includes('missing revert data')) {
      return 'Contract call failed. This may be an ACL permission or network issue. Try again.';
    }
    return 'Contract call failed. Please try again.';
  }
  
  // Handle user rejection
  if (error?.code === 'ACTION_REJECTED' || error?.code === 4001) {
    return 'Transaction rejected by user';
  }
  
  // Standard error extraction
  if (error?.message) return error.message;
  if (error?.reason) return error.reason;
  if (error?.data?.message) return error.data.message;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
};

export const PrivateVaultDemo = () => {
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
    error: fhevmError,
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

  // Tab state
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "history">("deposit");
  
  // Form states
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  
  // Copy state
  const [copied, setCopied] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{message: string; type: "success" | "error" | "info" | "warning"} | null>(null);
  
  // Progress tracking
  const [depositProgress, setDepositProgress] = useState(0);
  
  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawModalStep, setWithdrawModalStep] = useState(0);
  
  // Deposit history (mock for now)
  const [depositReceipt, setDepositReceipt] = useState<{amount: string; timestamp: string; txHash: string} | null>(null);
  
  // Transaction history from blockchain
  type Transaction = {
    type: "Deposit" | "Withdraw" | "WithdrawalRequested" | "WithdrawalRejected" | "WithdrawalCancelled";
    amount: string;
    timestamp: number;
    txHash: string;
    to?: string;
    blockNumber: number;
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Wallet ETH balance
  const [walletBalance, setWalletBalance] = useState<string>("0");
  
  // Listen for Withdrawn event to complete step 3
  useEffect(() => {
    if (!showWithdrawModal || withdrawModalStep !== 2 || !vault.vault.address || !ethersSigner) {
      return;
    }
    
    const vaultAddress = vault.vault.address;
    if (!vaultAddress) return;
    
    const setupWithdrawnListener = async () => {
      try {
        const userAddress = await ethersSigner.getAddress();
        const vaultContract = new ethers.Contract(
          vaultAddress,
          vault.vault.abi,
          ethersSigner.provider
        );
        
        // Listen for Withdrawn event
        const filter = vaultContract.filters.Withdrawn(userAddress);
        
        const handleWithdrawn = (user: string, to: string, amount: bigint) => {
          console.log("Withdrawn event detected:", { user, to, amount: amount.toString() });
          
          // Update to step 3 (ETH Transfer complete)
          setWithdrawModalStep(3);
          showToast(`Withdrawal complete! ${ethers.formatUnits(amount, 18)} ETH sent to ${to}`, "success");
          
          // Auto close modal after 3 seconds
          setTimeout(() => {
            setShowWithdrawModal(false);
            setWithdrawModalStep(0);
          }, 3000);
          
          // Refresh balance
          vault.refreshBalanceHandle();
        };
        
        vaultContract.once(filter, handleWithdrawn);
        
        // Cleanup
        return () => {
          vaultContract.off(filter, handleWithdrawn);
        };
      } catch (error) {
        console.error("Failed to setup Withdrawn listener:", error);
      }
    };
    
    setupWithdrawnListener();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWithdrawModal, withdrawModalStep, vault.vault.address, ethersSigner]);
  
  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (ethersSigner) {
        try {
          const address = await ethersSigner.getAddress();
          const balance = await ethersSigner.provider.getBalance(address);
          setWalletBalance(ethers.formatEther(balance));
        } catch (error) {
          console.error("Failed to fetch wallet balance:", error);
        }
      }
    };
    
    fetchWalletBalance();
    
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchWalletBalance, 10000);
    return () => clearInterval(interval);
  }, [ethersSigner]);
  
  // Fetch transaction history from blockchain
  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!vault.vault.address || !ethersSigner || !vault.isDeployed) {
        return;
      }
      
      setLoadingHistory(true);
      
      try {
        const userAddress = await ethersSigner.getAddress();
        const vaultContract = new ethers.Contract(
          vault.vault.address,
          vault.vault.abi,
          ethersSigner.provider
        );
        
        // Get current block
        const currentBlock = await ethersSigner.provider.getBlockNumber();
        // Fetch events from last 10000 blocks (adjust as needed)
        const fromBlock = Math.max(0, currentBlock - 10000);
        
        // Fetch all events
        const depositFilter = vaultContract.filters.Deposit(userAddress);
        const withdrawnFilter = vaultContract.filters.Withdrawn(userAddress);
        const withdrawalRequestedFilter = vaultContract.filters.WithdrawalRequested(userAddress);
        const withdrawalRejectedFilter = vaultContract.filters.WithdrawalRejectedZero(userAddress);
        const withdrawalCancelledFilter = vaultContract.filters.WithdrawalCancelled(userAddress);
        
        const [depositEvents, withdrawnEvents, withdrawalRequestedEvents, withdrawalRejectedEvents, withdrawalCancelledEvents] = await Promise.all([
          vaultContract.queryFilter(depositFilter, fromBlock, currentBlock),
          vaultContract.queryFilter(withdrawnFilter, fromBlock, currentBlock),
          vaultContract.queryFilter(withdrawalRequestedFilter, fromBlock, currentBlock),
          vaultContract.queryFilter(withdrawalRejectedFilter, fromBlock, currentBlock),
          vaultContract.queryFilter(withdrawalCancelledFilter, fromBlock, currentBlock),
        ]);
        
        const allTransactions: Transaction[] = [];
        
        // Process Deposit events
        for (const event of depositEvents) {
          if (!('args' in event)) continue;
          const block = await event.getBlock();
          allTransactions.push({
            type: "Deposit",
            amount: ethers.formatEther(event.args.amount || 0),
            timestamp: block.timestamp,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
          });
        }
        
        // Process Withdrawn events
        for (const event of withdrawnEvents) {
          if (!('args' in event)) continue;
          const block = await event.getBlock();
          allTransactions.push({
            type: "Withdraw",
            amount: ethers.formatUnits(event.args.amount || 0, 18),
            timestamp: block.timestamp,
            txHash: event.transactionHash,
            to: event.args.to,
            blockNumber: event.blockNumber,
          });
        }
        
        // Process WithdrawalRequested events
        for (const event of withdrawalRequestedEvents) {
          if (!('args' in event)) continue;
          const block = await event.getBlock();
          allTransactions.push({
            type: "WithdrawalRequested",
            amount: "Pending...",
            timestamp: block.timestamp,
            txHash: event.transactionHash,
            to: event.args.to,
            blockNumber: event.blockNumber,
          });
        }
        
        // Process WithdrawalRejected events
        for (const event of withdrawalRejectedEvents) {
          if (!('args' in event)) continue;
          const block = await event.getBlock();
          allTransactions.push({
            type: "WithdrawalRejected",
            amount: "0 (Rejected)",
            timestamp: block.timestamp,
            txHash: event.transactionHash,
            to: event.args.to,
            blockNumber: event.blockNumber,
          });
        }
        
        // Process WithdrawalCancelled events
        for (const event of withdrawalCancelledEvents) {
          if (!('args' in event)) continue;
          const block = await event.getBlock();
          allTransactions.push({
            type: "WithdrawalCancelled",
            amount: "Cancelled",
            timestamp: block.timestamp,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
          });
        }
        
        // Sort by timestamp descending (newest first)
        allTransactions.sort((a, b) => b.timestamp - a.timestamp);
        
        setTransactions(allTransactions);
      } catch (error) {
        console.error("Failed to fetch transaction history:", error);
        showToast("Failed to load transaction history", "error");
      } finally {
        setLoadingHistory(false);
      }
    };
    
    fetchTransactionHistory();
    
    // Refresh history when switching to history tab
    if (activeTab === "history") {
      fetchTransactionHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault.vault.address, ethersSigner, vault.isDeployed, activeTab]);
  
  // Show toast helper
  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToast({ message, type });
  };
  
  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("Address copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy", "error");
    }
  };
  
  // Quick amount selector values
  const quickAmounts = ["0.05", "0.1", "0.5", "1.0", "5.0"];
  
  // Deposit steps
  const depositSteps = ["Confirm transaction", "Processing deposit", "Updating balance"];

  // Styles
  const buttonClass =
    "inline-flex items-center justify-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-md " +
    "transition-all duration-200 hover:bg-yellow-600 hover:shadow-lg active:scale-95 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 p-3">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg border-2 border-gray-800 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1.5">
            CHIPER PROTOCOL
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <span className="text-sm font-medium">Confidential Transfer</span>
            <span>-</span>
            <span className="text-xs">Powered by Zama FHEVM</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-1.5 flex gap-1.5">
        <button
          onClick={() => setActiveTab("deposit")}
          className={`flex-1 py-2 px-4 text-sm rounded-lg font-semibold transition-all ${
            activeTab === "deposit"
              ? "bg-yellow-500 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          DEPOSIT
        </button>
        <button
          onClick={() => setActiveTab("withdraw")}
          className={`flex-1 py-2 px-4 text-sm rounded-lg font-semibold transition-all ${
            activeTab === "withdraw"
              ? "bg-yellow-500 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          WITHDRAW
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 px-4 text-sm rounded-lg font-semibold transition-all ${
            activeTab === "history"
              ? "bg-yellow-500 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          HISTORY
        </button>
      </div>

      {/* Status Message */}
      {vault.message && !vault.message.includes("deployment not found") && (
        <div
          className={`bg-white rounded-lg shadow-md p-4 border ${
            vault.message.includes("failed") || vault.message.includes("error")
              ? "border-red-200 bg-red-50"
              : vault.message.includes("oracle") || vault.message.includes("Waiting")
              ? "border-gray-200 bg-gray-50"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div>
            <p
              className={
                vault.message.includes("failed") || vault.message.includes("error")
                  ? "text-red-700 font-semibold"
                  : "text-gray-900 font-semibold"
              }
            >
              {vault.message}
            </p>
            {(vault.message.includes("oracle") || vault.message.includes("Waiting")) && (
              <div className="mt-3 text-sm text-gray-700">
                <p className="mb-2">⏱️ <strong>Estimated time:</strong> ~16 seconds</p>
                <p className="mb-2">🔄 <strong>What&apos;s happening:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1 text-gray-600">
                  <li>Oracle is decrypting your encrypted amount</li>
                  <li>ETH will be sent once decryption completes</li>
                  <li>Your balance has already been deducted</li>
                </ul>
                <p className="mt-3">
                  <a 
                    href={`https://sepolia.etherscan.io/address/${vault.vault.address}#events`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-500 hover:text-yellow-600 underline"
                  >
                    📊 Check withdrawal status on Etherscan →
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Encrypted Vault Balance Display */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🔒</span>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">Encrypted Vault Balance</h3>
            <p className="text-xs text-gray-600">Your balance is protected by FHE (Fully Homomorphic Encryption)</p>
          </div>
        </div>
        
        {vault.isDecrypting && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>🔓 Decrypting...</span>
              <span className="font-semibold">
                {vault.decryptProgress.done} / {vault.decryptProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    vault.decryptProgress.total > 0
                      ? (vault.decryptProgress.done /
                          vault.decryptProgress.total) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
        )}
        
        {vault.isDecrypted && vault.clearBalance ? (
          <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">✓ Decrypted Successfully</p>
                <p className="text-3xl font-bold text-gray-900">
                  {ethers.formatEther(BigInt(vault.clearBalance.clear))} ETH
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(!vault.balanceHandle || vault.balanceHandle === "0x0000000000000000000000000000000000000000000000000000000000000000") && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                  <div>
                    <p className="text-xs font-bold text-yellow-800 mb-1">No Balance Yet</p>
                    <p className="text-xs text-yellow-700">
                      This is a new contract deployment. Please make a deposit first to initialize your encrypted balance.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <p className="text-xs text-gray-500 mb-2">🔐 Encrypted Balance Handle:</p>
              <p className="text-xs font-mono text-gray-700 break-all bg-gray-50 p-2 rounded">
                {vault.balanceHandle || "No balance handle yet"}
              </p>
            </div>
            
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex-1">
                <p className="text-xs text-gray-700 font-medium">💡 To view your balance:</p>
                <p className="text-xs text-gray-600 mt-1">Click the &quot;Decrypt&quot; button to decrypt your encrypted balance using your wallet</p>
              </div>
              <button
                className="ml-3 px-4 py-2 rounded-lg bg-yellow-500 text-white font-semibold text-sm hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={!isConnected || !vault.isDeployed || !vault.canDecrypt || vault.isDecrypting}
                title={!isConnected ? "Please connect wallet first" : !vault.isDeployed ? "Contract not deployed" : ""}
                onClick={async () => {
                  try {
                    await vault.decryptBalance();
                  } catch (e) {
                    showToast(`Decrypt failed: ${getErrorMessage(e)}`, "error");
                  }
                }}
              >
                {vault.isDecrypting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Decrypting</span>
                  </>
                ) : (
                  <>
                    <span>🔓</span>
                    <span>Decrypt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "deposit" && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-4">
          {/* Section Header */}
          <div className="border-b-2 border-gray-800 pb-2">
            <h2 className="text-base font-bold text-gray-900">DEPOSIT</h2>
            <p className="text-sm text-gray-600 mt-1">
              Deposit ETH to encrypted vault for private use
            </p>
          </div>

          {/* Wallet Connection Warning */}
          {!isConnected && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    Please connect your wallet to make transactions
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FHE Vault Address */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              FHE VAULT ADDRESS
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={vault.vault.address || "0xC520A1c9B64511722f7733d9E07939539643A62"}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-700"
              />
              <button
                onClick={() => copyToClipboard(vault.vault.address || "")}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Transfer Amount */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              TRANSFER AMOUNT
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 px-3 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                ETH
              </span>
              <input
                type="number"
                step="0.001"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="0.000000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                disabled={vault.isProcessing}
              />
            </div>
            <p className="text-sm text-gray-600">
              Available Balance: {walletBalance} ETH
            </p>
          </div>

          {/* Quick Amount Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              QUICK AMOUNT SELECTOR
            </label>
            <div className="flex gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount)}
                  disabled={vault.isProcessing}
                  className="flex-1 py-2 px-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Deposit Progress */}
          {vault.isProcessing && depositProgress > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <ProgressSteps steps={depositSteps} currentStep={depositProgress} />
            </div>
          )}

          {/* Generated Record Display */}
          {depositReceipt && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-900">
                DEPOSIT RECEIPT
              </label>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 font-mono text-xs space-y-1">
                <p><span className="text-gray-600">Amount:</span> {depositReceipt.amount} ETH</p>
                <p><span className="text-gray-600">Time:</span> {depositReceipt.timestamp}</p>
                <p className="truncate"><span className="text-gray-600">Tx Hash:</span> {depositReceipt.txHash}</p>
              </div>
            </div>
          )}

          {/* Deposit Button */}
          <button
            className={buttonClass + " w-full py-4 text-lg"}
            disabled={
              !isConnected ||
              !vault.isDeployed ||
              !depositAmount ||
              parseFloat(depositAmount) <= 0 ||
              vault.isProcessing
            }
            title={!isConnected ? "Please connect wallet first" : !vault.isDeployed ? "Contract not deployed" : ""}
            onClick={async () => {
              try {
                setDepositProgress(0);
                showToast("Starting deposit...", "info");
                setDepositProgress(1);
                
                const amount = ethers.parseEther(depositAmount);
                await vault.deposit(amount);
                
                setDepositProgress(2);
                setTimeout(() => {
                  setDepositProgress(3);
                  showToast("Deposit successful! Balance updated.", "success");
                  
                  // Save receipt
                  setDepositReceipt({
                    amount: depositAmount,
                    timestamp: new Date().toLocaleString(),
                    txHash: "Check Etherscan for details"
                  });
                  
                  setDepositAmount("");
                  setTimeout(() => setDepositProgress(0), 1000);
                }, 500);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } catch (e: any) {
                setDepositProgress(0);
                
                if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
                  showToast("Transaction cancelled by user", "warning");
                } else {
                  console.error("Deposit error:", e);
                  showToast(`Deposit failed: ${getErrorMessage(e)}`, "error");
                }
              }
            }}
          >
            {vault.isProcessing ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">PROCESSING...</span>
              </>
            ) : "DEPOSIT TO VAULT"}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Your balance is encrypted and stored privately on-chain
          </p>
        </div>
      )}

      {activeTab === "withdraw" && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-4">
          {/* Section Header */}
          <div className="border-b-2 border-gray-800 pb-2">
            <h2 className="text-base font-bold text-gray-900">WITHDRAW</h2>
            <p className="text-sm text-gray-600 mt-1">
              Decrypt your balance in the vault first to ensure that your balance is not empty in the vault
            </p>
          </div>

          {/* Wallet Connection Warning */}
          {!isConnected && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    Please connect your wallet to make transactions
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Balance Zero Warning */}
          {vault.clearBalance && vault.clearBalance.clear === BigInt(0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm font-medium">
                ⚠️ Balance is 0 - Cannot withdraw
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                Please deposit ETH first before withdrawing
              </p>
            </div>
          )}

          {/* Withdraw Amount */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              WITHDRAWAL AMOUNT
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 px-3 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                ETH
              </span>
              <input
                type="number"
                step="0.001"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="0.000000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={vault.isProcessing || (vault.clearBalance?.clear === BigInt(0))}
              />
            </div>
            {vault.clearBalance && vault.clearBalance.clear !== BigInt(0) && (
              <p className="text-sm text-gray-600">
                Available: {ethers.formatEther(vault.clearBalance.clear.toString())} ETH
              </p>
            )}
          </div>

          {/* To Address */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              TO ADDRESS
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="0x..."
              value={withdrawTo}
              onChange={(e) => setWithdrawTo(e.target.value)}
              disabled={vault.isProcessing || (vault.clearBalance?.clear === BigInt(0))}
            />
          </div>

          {/* Withdraw Button */}
          <button
            className={buttonClass + " w-full py-4 text-lg"}
            disabled={
              !isConnected ||
              !vault.isDeployed ||
              !withdrawAmount ||
              !withdrawTo ||
              parseFloat(withdrawAmount) <= 0 ||
              vault.isProcessing ||
              (vault.clearBalance?.clear === BigInt(0)) ||
              !fhevmInstance
            }
            title={!isConnected ? "Please connect wallet first" : !vault.isDeployed ? "Contract not deployed" : ""}
            onClick={async () => {
              try {
                const amount = ethers.parseEther(withdrawAmount);
                
                // Validate amount
                if (vault.clearBalance && typeof vault.clearBalance.clear === 'bigint') {
                  if (amount > vault.clearBalance.clear) {
                    showToast(`Amount exceeds balance! Available: ${ethers.formatEther(vault.clearBalance.clear)} ETH`, "error");
                    return;
                  }
                }
                
                // Validate fhevmInstance and contract
                if (!fhevmInstance || !vault.vault.address || !ethersSigner) {
                  showToast("FHEVM instance or vault not ready", "error");
                  return;
                }
                
                // Show modal and start step 0 (Encrypting)
                setShowWithdrawModal(true);
                setWithdrawModalStep(0);
                
                // Step 0: Create encrypted input (real encryption process)
                const userAddress = await ethersSigner.getAddress();
                const input = fhevmInstance.createEncryptedInput(vault.vault.address, userAddress);
                if (!input) {
                  throw new Error("Failed to create encrypted input");
                }
                
                input.add128(amount);
                const encryptedInput = await input.encrypt();
                
                // Step 1: Submitting request (after encryption done)
                setWithdrawModalStep(1);
                
                // Submit transaction to blockchain
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
                
                // Wait for transaction confirmation
                await tx.wait();
                
                // Step 2: Oracle processing (after tx confirmed)
                setWithdrawModalStep(2);
                
                showToast("Withdrawal request confirmed! Oracle is now processing.", "success");
                
                setWithdrawAmount("");
                setWithdrawTo("");
                
                // Refresh balance after tx confirmed
                setTimeout(() => {
                  vault.refreshBalanceHandle();
                }, 2000);
                
                // Auto-progress: Step 2 (Oracle) -> Step 3 after 16 seconds
                setTimeout(() => {
                  setWithdrawModalStep(3);
                  showToast("ETH transfer in progress...", "info");
                  
                  // Auto-complete: Step 3 -> Close after 4 seconds
                  setTimeout(() => {
                    showToast("Withdrawal complete!", "success");
                    setShowWithdrawModal(false);
                    setWithdrawModalStep(0);
                    vault.refreshBalanceHandle();
                  }, 4000);
                }, 16000);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } catch (e: any) {
                setShowWithdrawModal(false);
                setWithdrawModalStep(0);
                
                if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
                  showToast("Transaction cancelled by user", "warning");
                } else {
                  console.error("Withdrawal error:", e);
                  showToast(`Withdrawal failed: ${getErrorMessage(e)}`, "error");
                }
              }
            }}
          >
            {vault.isProcessing ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">PROCESSING...</span>
              </>
            ) : "WITHDRAW FROM VAULT"}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Withdrawal requests are processed by the oracle with public decryption (Est. ~16 seconds)
          </p>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-4">
          {/* Section Header */}
          <div className="border-b-2 border-gray-800 pb-2">
            <h2 className="text-base font-bold text-gray-900">TRANSACTION HISTORY</h2>
            <p className="text-sm text-gray-600 mt-1">
              View your deposit and withdrawal history
            </p>
          </div>

          {/* History Content */}
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" />
                <p className="text-gray-500 mt-4">Loading transaction history...</p>
              </div>
            ) : transactions.length === 0 ? (
              <>
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No transaction history yet</p>
                  <p className="text-gray-400 text-sm mt-1">Your deposits and withdrawals will appear here</p>
                </div>
                
                {/* Debug Info Link */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 text-sm font-medium mb-2">
                    View on Blockchain Explorer
                  </p>
                  <a 
                    href={`https://sepolia.etherscan.io/address/${vault.vault.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-500 hover:text-yellow-600 underline text-sm"
                  >
                    Check contract events on Etherscan →
                  </a>
                </div>
              </>
            ) : (
              <>
                {/* Transaction List */}
                <div className="space-y-3">
                  {transactions.map((tx, index) => {
                    const typeColors = {
                      "Deposit": "bg-white border-gray-200 hover:border-gray-300",
                      "Withdraw": "bg-white border-gray-200 hover:border-gray-300",
                      "WithdrawalRequested": "bg-white border-gray-200 hover:border-gray-300",
                      "WithdrawalRejected": "bg-white border-gray-200 hover:border-gray-300",
                      "WithdrawalCancelled": "bg-white border-gray-200 hover:border-gray-300",
                    };
                    
                    const typeIcons = {
                      "Deposit": "↓",
                      "Withdraw": "↑",
                      "WithdrawalRequested": "⏳",
                      "WithdrawalRejected": "✕",
                      "WithdrawalCancelled": "⏱",
                    };
                    
                    const typeTextColors = {
                      "Deposit": "text-gray-900",
                      "Withdraw": "text-gray-900",
                      "WithdrawalRequested": "text-gray-900",
                      "WithdrawalRejected": "text-gray-900",
                      "WithdrawalCancelled": "text-gray-900",
                    };
                    
                    return (
                      <div key={index} className={`border rounded-lg p-4 transition-all ${typeColors[tx.type]}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{typeIcons[tx.type]}</span>
                              <span className={`font-bold text-sm ${typeTextColors[tx.type]}`}>
                                {tx.type === "WithdrawalRequested" ? "Waiting for Oracle Decryption" : 
                                 tx.type === "WithdrawalRejected" ? "Withdrawal Rejected" : 
                                 tx.type === "WithdrawalCancelled" ? "Withdrawal Cancelled" : tx.type}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-600">
                              <p>
                                <span className="font-semibold">Amount:</span> {tx.amount} ETH
                              </p>
                              {tx.to && (
                                <p>
                                  <span className="font-semibold">To:</span>{" "}
                                  <span className="font-mono">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</span>
                                </p>
                              )}
                              <p>
                                <span className="font-semibold">Time:</span>{" "}
                                {new Date(tx.timestamp * 1000).toLocaleString()}
                              </p>
                              <p>
                                <span className="font-semibold">Block:</span> {tx.blockNumber}
                              </p>
                              
                              {/* Extra info for WithdrawalRequested */}
                              {tx.type === "WithdrawalRequested" && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-gray-700 font-medium text-xs">
                                    🔐 <strong>Processing:</strong> Zama oracle is using FHE to decrypt your encrypted withdrawal amount (~16 sec)
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-200 text-gray-700 font-medium"
                          >
                            View →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Explorer Link */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <a 
                    href={`https://sepolia.etherscan.io/address/${vault.vault.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    View all events on Etherscan →
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debug Info */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="cursor-pointer font-semibold text-gray-700">
          Debug Info
        </summary>
        <div className="mt-4 space-y-2 text-sm font-mono">
          <p>
            <span className="font-semibold">Chain ID:</span> {chainId}
          </p>
          <p>
            <span className="font-semibold">Vault Address:</span>{" "}
            {vault.vault.address || "Not deployed"}
          </p>
          <p>
            <span className="font-semibold">Balance Handle:</span>{" "}
            {vault.balanceHandle || "None"}
          </p>
          <p>
            <span className="font-semibold">FHEVM Status:</span> {fhevmStatus}
          </p>
          {fhevmError && (
            <p className="text-red-600">
              <span className="font-semibold">FHEVM Error:</span>{" "}
              {getErrorMessage(fhevmError)}
            </p>
          )}
        </div>
      </details>
      
      {/* Withdrawal Progress Modal */}
      <WithdrawalProgressModal
        isOpen={showWithdrawModal}
        currentStep={withdrawModalStep}
        onClose={() => {
          setShowWithdrawModal(false);
          setWithdrawModalStep(0);
        }}
      />
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        </div>
      )}
    </div>
  );
};

