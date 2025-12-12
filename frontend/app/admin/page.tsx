"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ContractRead } from "@/lib/contract";
import AdminPanel from "@/components/AdminPanel";
import { useRouter } from "next/navigation";


export default function AdminPageClient() {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isConnected || !address) {
      setIsAdmin(false);
      router.push("/"); // if not connected, go home
      return;
    }
    (async () => {
      try {
        const a = await ContractRead.admins(address);
        setIsAdmin(a);
        if (!a) router.push("/"); // not admin => redirect out
      } catch (e) {
        setIsAdmin(false);
        router.push("/");
      }
    })();
  }, [isConnected, address, router]);

  if (isAdmin === null) return <div>Checking access...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  return <AdminPanel />;
}
