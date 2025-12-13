import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "ethers",
      "@wagmi/core",
      "@rainbow-me/rainbowkit",
      "viem",
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fallback Node modules to prevent client-side build errors
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
