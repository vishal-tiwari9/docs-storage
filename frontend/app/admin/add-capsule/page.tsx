"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

import {
  ContractRead,
} from "../../../lib/contract";

import  CapsuleForm  from "../../../components/CapsuleForm";

export default function AddCapsulePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // If wallet not connected → deny and redirect
    if (!isConnected || !address) {
      setIsAdmin(false);
      router.push("/");
      return;
    }

    (async () => {
      try {
        const admin = await ContractRead.admins(address);
        setIsAdmin(admin);

        if (!admin) {
          router.push("/");
        }
      } catch (err) {
        console.error(err);
        setIsAdmin(false);
        router.push("/");
      }
    })();
  }, [isConnected, address, router]);

  // Loading state
  if (isAdmin === null) {
    return <div className="p-6">Checking admin access…</div>;
  }

  // Non-admin fallback (rarely shown due to redirect)
  if (!isAdmin) {
    return <div className="p-6">Access denied</div>;
  }

  // Render form only when admin
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Add New Capsule</h1>
      <CapsuleForm />
    </div>
  );
}
