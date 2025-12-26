"use client";

import type { ReactNode } from "react";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from '@/config/wagmi';
import { WalletProvider } from "@/hooks/wallet/useWalletAdapter";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { WalletEthersSignerProvider } from "@/hooks/wallet/useWalletEthersSigner";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";

const queryClient = new QueryClient();

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <>
      <GlobalErrorHandler />
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={lightTheme({
              accentColor: '#eab308',
              accentColorForeground: 'white',
              borderRadius: 'medium',
            })}
          >
            <WalletProvider>
              <WalletEthersSignerProvider initialMockChains={{}}>
                <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
              </WalletEthersSignerProvider>
            </WalletProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}

