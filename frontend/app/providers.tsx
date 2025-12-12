"use client";

import '@rainbow-me/rainbowkit/styles.css';
import { WagmiConfig, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';

import { sepolia, mainnet, polygonAmoy } from 'wagmi/chains';

const amoyRpc =
  process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC ??
  "https://polygon-amoy.g.alchemy.com/v2/-zPXKPdSmOnk7TfFnJpb8";

const chains = [polygonAmoy, sepolia, mainnet];

// ✔ Correct for your installed RainbowKit version
const { connectors } = getDefaultWallets({
  appName: "Sehsaa",
  projectId: "23bb964aee763512743dd835ce616ad1",
  chains,
});

const config = createConfig({
  chains,
  connectors,
  transports: {
    [polygonAmoy.id]: http(amoyRpc),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={polygonAmoy}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
