import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 🔴 FIX 1: move out of experimental
  serverExternalPackages: [
    "ethers",
    "@wagmi/core",
    "@rainbow-me/rainbowkit",
    "viem",
  ],

  // 🔴 FIX 2: keep webpack config
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        os: false,
        path: false,
        crypto: false,
        stream: false,
      };
    }
    return config;
  },
};

export default nextConfig;
