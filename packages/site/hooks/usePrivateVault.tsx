"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FhevmDecryptionSignature,
  type FhevmInstance,
  type GenericStringStorage,
} from "@fhevm/react";

// Generated ABI files
import { ChiperProtocolAddresses } from "@/abi/ChiperProtocolAddresses";
import { ChiperProtocolABI } from "@/abi/ChiperProtocolABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

// Safe error message extractor
const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  
  // Handle ethers.js CALL_EXCEPTION
  if (error?.code === 'CALL_EXCEPTION') {
    if (error?.reason) return error.reason;
    if (error?.message?.includes('missing revert data')) {
      return 'Contract call failed (missing revert data). This may be an ACL permission issue or network problem. Try refreshing.';
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
  if (error?.error?.message) return error.error.message;
  
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
};

type PrivateVaultInfoType = {
  abi: typeof ChiperProtocolABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getPrivateVaultByChainId(
  chainId: number | undefined
): PrivateVaultInfoType {
  if (!chainId) {
    return { abi: ChiperProtocolABI.abi };
  }

  const entry =
    ChiperProtocolAddresses[
      chainId.toString() as keyof typeof ChiperProtocolAddresses
    ];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: ChiperProtocolABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}` | undefined,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: ChiperProtocolABI.abi,
  };
}

export const usePrivateVault = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  // States
  const [balanceHandle, setBalanceHandle] = useState<string | undefined>(
    undefined
  );
  const [clearBalance, setClearBalance] = useState<ClearValueType | undefined>(
    undefined
  );
  const clearBalanceRef = useRef<ClearValueType>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [decryptProgress, setDecryptProgress] = useState<{
    done: number;
    total: number;
  }>({ done: 0, total: 0 });

  const vaultRef = useRef<PrivateVaultInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isProcessingRef = useRef<boolean>(isProcessing);

  const isDecrypted = balanceHandle && balanceHandle === clearBalance?.handle;

  // Contract info
  const vault = useMemo(() => {
    const v = getPrivateVaultByChainId(chainId);
    vaultRef.current = v;

    if (!v.address) {
      setMessage(`PrivateVault deployment not found for chainId=${chainId}.`);
    }

    return v;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!vault) {
      return undefined;
    }
    return Boolean(vault.address) && vault.address !== ethers.ZeroAddress;
  }, [vault]);

  // Refresh balance handle
  const refreshBalanceHandle = useCallback(() => {
    console.log("[usePrivateVault] refreshBalanceHandle()");
    if (isRefreshingRef.current) {
      return;
    }

    if (
      !vaultRef.current ||
      !vaultRef.current?.chainId ||
      !vaultRef.current?.address ||
      !ethersReadonlyProvider ||
      !ethersSigner
    ) {
      setBalanceHandle(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = vaultRef.current.chainId;
    const thisVaultAddress = vaultRef.current.address;

    const vaultContract = new ethers.Contract(
      thisVaultAddress,
      vaultRef.current.abi,
      ethersSigner
    );

    vaultContract
      .myBalance()
      .then((handle: string) => {
        console.log("[usePrivateVault] balanceHandle=" + handle);
        if (
          sameChain.current(thisChainId) &&
          thisVaultAddress === vaultRef.current?.address
        ) {
          setBalanceHandle(handle);
        }

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e: any) => {
        console.error("[usePrivateVault] myBalance() error:", e);
        
        // Handle specific errors more gracefully
        if (e?.code === 'CALL_EXCEPTION' && e?.message?.includes('missing revert data')) {
          console.warn("[usePrivateVault] ACL permission issue detected, will retry on next refresh");
          // Don't show error for ACL issues, will retry automatically
          setBalanceHandle(undefined);
          setMessage(""); // Clear any previous errors
        } else {
          // Show error for other types of failures
          setMessage("Failed to fetch balance: " + getErrorMessage(e));
        }
        
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, ethersSigner, sameChain]);

  useEffect(() => {
    refreshBalanceHandle();
  }, [refreshBalanceHandle]);

  // Decrypt balance
  const canDecrypt = useMemo(() => {
    return (
      vault.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      balanceHandle &&
      balanceHandle !== ethers.ZeroHash &&
      balanceHandle !== clearBalance?.handle
    );
  }, [
    vault.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    balanceHandle,
    clearBalance,
  ]);

  const decryptBalance = useCallback(async () => {
    console.log("[usePrivateVault] decryptBalance()");
    if (isDecryptingRef.current) {
      return;
    }

    if (!canDecrypt) {
      return;
    }

    // Check if balance handle is valid (not zero/empty)
    if (!balanceHandle || balanceHandle === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      setMessage("⚠️ No balance to decrypt. Please deposit ETH first.");
      return;
    }

    if (
      clearBalanceRef.current &&
      clearBalanceRef.current.handle === balanceHandle
    ) {
      console.log("[usePrivateVault] already decrypted, using cache");
      setClearBalance(clearBalanceRef.current);
      return;
    }

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setDecryptProgress({ done: 0, total: 1 });

    const thisChainId = chainId;
    const thisVaultAddress = vault.address;
    const thisSigner = ethersSigner;

    try {
      // Create auth token for userDecrypt
      const sig: FhevmDecryptionSignature | null =
        await FhevmDecryptionSignature.loadOrSign(
          instance!,
          [vault.address! as `0x${string}`],
          ethersSigner!,
          fhevmDecryptionSignatureStorage
        );

      if (!sig) {
        setMessage("Unable to build FHEVM decryption signature");
        isDecryptingRef.current = false;
        setIsDecrypting(false);
        return;
      }

      // Decrypt handle
      console.log("[usePrivateVault] decrypting handle:", balanceHandle);
      const res = await instance!.userDecrypt(
        [{ handle: balanceHandle!, contractAddress: thisVaultAddress! }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const decryptedValue = res[balanceHandle!];
      console.log("[usePrivateVault] decrypted value:", decryptedValue);

      setDecryptProgress({ done: 1, total: 1 });

      if (
        sameChain.current(thisChainId) &&
        sameSigner.current(thisSigner) &&
        thisVaultAddress === vaultRef.current?.address
      ) {
        const result = {
          handle: balanceHandle!,
          clear: decryptedValue,
        };
        clearBalanceRef.current = result;
        setClearBalance(result);
      }

      isDecryptingRef.current = false;
      setIsDecrypting(false);
    } catch (e: any) {
      console.error("[usePrivateVault] decrypt error:", e);
      
      // Better error messages for common issues
      let errorMsg = getErrorMessage(e);
      if (errorMsg.includes("HTTP code 500") || errorMsg.includes("relayer")) {
        errorMsg = "⚠️ Decryption failed: The balance might be zero or not yet initialized. Try depositing first, then refresh the page.";
      } else if (errorMsg.includes("Failed to fetch")) {
        errorMsg = "⚠️ Network error: Cannot reach Zama relayer. Check your internet connection and try again.";
      }
      
      setMessage("Decrypt failed: " + errorMsg);
      isDecryptingRef.current = false;
      setIsDecrypting(false);
    }
  }, [
    canDecrypt,
    balanceHandle,
    instance,
    ethersSigner,
    vault.address,
    chainId,
    fhevmDecryptionSignatureStorage,
    sameChain,
    sameSigner,
  ]);

  // Deposit
  const deposit = useCallback(
    async (amount: bigint) => {
      console.log("[usePrivateVault] deposit:", amount);
      if (isProcessingRef.current || !ethersSigner || !vault.address) {
        setMessage("Wallet not connected or vault not deployed");
        return;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);
      setMessage("Depositing...");

      try {
        // Call depositETH with ETH value (no encryption needed)
        const vaultContract = new ethers.Contract(
          vault.address,
          vault.abi,
          ethersSigner
        );
        const tx = await vaultContract.depositETH({ value: amount });
        await tx.wait();

        setMessage("✅ Deposit successful! Balance encrypted on-chain.");
        refreshBalanceHandle();
      } catch (e: any) {
        console.error("[usePrivateVault] deposit error:", e);
        setMessage("❌ Deposit failed: " + getErrorMessage(e));
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [ethersSigner, vault.address, vault.abi, refreshBalanceHandle]
  );

  // Withdraw
  const withdraw = useCallback(
    async (to: string, amount: bigint) => {
      console.log("[usePrivateVault] withdraw:", { to, amount });
      if (isProcessingRef.current || !instance || !ethersSigner || !vault.address) {
        setMessage("FHEVM instance not ready or vault not deployed");
        return;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);
      setMessage("Requesting withdrawal...");

      try {
        const userAddress = await ethersSigner.getAddress();
        
        // Create encrypted input (128-bit for euint128)
        const input = instance.createEncryptedInput(vault.address, userAddress);
        if (!input) {
          throw new Error("Failed to create encrypted input");
        }
        
        input.add128(amount);
        const encryptedInput = await input.encrypt();

        // Call requestWithdraw
        const vaultContract = new ethers.Contract(
          vault.address,
          vault.abi,
          ethersSigner
        );
        const tx = await vaultContract.requestWithdraw(
          to,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );
        const receipt = await tx.wait();

        setMessage(
          "✅ Withdrawal requested! Waiting for oracle to decrypt and send ETH (5-10 min)..."
        );
        console.log("[usePrivateVault] withdraw receipt:", receipt);

        // Refresh balance
        setTimeout(() => {
          refreshBalanceHandle();
        }, 2000);
      } catch (e: any) {
        console.error("[usePrivateVault] withdraw error:", e);
        setMessage("❌ Withdraw failed: " + getErrorMessage(e));
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [instance, ethersSigner, vault.address, vault.abi, refreshBalanceHandle]
  );

  return {
    vault,
    isDeployed,
    balanceHandle,
    clearBalance,
    isRefreshing,
    isDecrypting,
    isProcessing,
    isDecrypted,
    canDecrypt,
    message,
    decryptProgress,
    decryptBalance,
    deposit,
    withdraw,
    refreshBalanceHandle,
  };
};

