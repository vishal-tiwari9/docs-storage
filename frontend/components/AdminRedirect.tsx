"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { useRouter } from "next/navigation";
import { ContractRead } from "@/lib/contract";
import { ethers } from "ethers";

export default function AdminRedirect() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const { data: walletClient } = useWalletClient();

  const checkingRef = useRef(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setIsAdmin(null);
      return;
    }
    if (checkingRef.current) return;

    (async () => {
      checkingRef.current = true;

      try {
        // 1) Check chain ID
        const expectedChain = Number(
          process.env.NEXT_PUBLIC_CHAIN_ID || "80002"
        );
        if (chainId !== expectedChain) {
          setIsAdmin(false);
          checkingRef.current = false;
          return;
        }

        // 2) On-chain admin check
        const adminStatus = await ContractRead.admins(address);
        setIsAdmin(adminStatus);

        if (adminStatus) {
          // 3) Verify signer (Wagmi v2 way)
          if (walletClient) {
            try {
              const signerAddr = await walletClient.getAddress();

              if (signerAddr?.toLowerCase() !== address.toLowerCase()) {
                checkingRef.current = false;
                return;
              }
            } catch {
              // signer unavailable — continue anyway
            }
          }

          // 4) Navigate to /admin if not already there
          if (!window.location.pathname.startsWith("/admin")) {
            router.push("/admin");
          }
        } else {
          // Not admin → push to home if on admin page
          if (window.location.pathname.startsWith("/admin")) {
            router.push("/");
          }
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        setIsAdmin(false);
      } finally {
        checkingRef.current = false;
      }
    })();
  }, [isConnected, address, chainId, router, walletClient]);

  return null;
}
