"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { useRouter } from "next/navigation";
import { ContractRead } from "@/lib/contract";

export default function AdminRedirect() {
  const router = useRouter();
  const chainId = useChainId();

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const checkingRef = useRef(false);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (checkingRef.current) return;

    const run = async () => {
      checkingRef.current = true;

      try {
        // ------------------------------
        // 1. Validate chain
        // ------------------------------
        const expectedChain = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "80002");
        if (chainId !== expectedChain) {
          router.push("/");
          return;
        }

        // ------------------------------
        // 2. Check if user is admin
        // ------------------------------
        const isAdmin = await ContractRead.admins(address);
        if (!isAdmin) {
          if (window.location.pathname.startsWith("/admin")) {
            router.push("/");
          }
          return;
        }

        // ------------------------------
        // 3. Validate signer address
        // ------------------------------
        if (walletClient) {
          try {
            const [signerAddr] = await walletClient.getAddresses(); // viem correct method

            if (!signerAddr || signerAddr.toLowerCase() !== address.toLowerCase()) {
              return;
            }
          } catch {
            // wallet issue → continue
          }
        }

        // ------------------------------
        // 4. Redirect to /admin
        // ------------------------------
        if (!window.location.pathname.startsWith("/admin")) {
          router.push("/admin");
        }
      } catch (err) {
        console.error("Admin redirect error:", err);
      } finally {
        checkingRef.current = false;
      }
    };

    run();
  }, [isConnected, address, chainId, router, walletClient]);

  return null;
}
