"use client";

import "@rainbow-me/rainbowkit/styles.css";

import React from "react";
import type { ReactNode } from "react";

import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { Chain } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

import {
  RainbowKitProvider,
  getDefaultWallets,
} from "@rainbow-me/rainbowkit";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* -------------------------------------------------------------------------- */
/*                            POLYGON AMOY CHAIN                               */
/* -------------------------------------------------------------------------- */

const polygonAmoy: Chain = {
  id: 80002,
  name: "Polygon Amoy",
  network: "polygon-amoy",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        "https://polygon-amoy.g.alchemy.com/v2/I96YCLEZ39ZcNytDb2obO",
      ],
    },
    public: {
      http: [
        "https://polygon-amoy.g.alchemy.com/v2/I96YCLEZ39ZcNytDb2obO",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://amoy.polygonscan.com",
    },
  },
  testnet: true,
};

/* -------------------------------------------------------------------------- */
/*                              WAGMI CONFIG                                   */
/* -------------------------------------------------------------------------- */

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [polygonAmoy], // 🚫 ONLY AMOY — NO MAINNET, NO SEPOLIA
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: "Sehsaa",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

/* -------------------------------------------------------------------------- */
/*                            REACT QUERY CLIENT                                */
/* -------------------------------------------------------------------------- */

const queryClient = new QueryClient();

/* -------------------------------------------------------------------------- */
/*                                PROVIDER                                     */
/* -------------------------------------------------------------------------- */

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          chains={chains}
          modalSize="compact"
          showRecentTransactions
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
