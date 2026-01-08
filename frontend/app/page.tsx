"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";

import Header from "../components/Header";
import Footer from "../components/Footer";
import CapsuleTable from "@/components/CapsuleTable";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ContractRead } from "@/lib/contract";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [showConnectPopup, setShowConnectPopup] = useState(false);

  /* ------------------ ADMIN CHECK ------------------ */
  useEffect(() => {
    async function checkAdmin() {
      if (!isConnected || !address) {
        setCheckingAdmin(false);
        setShowConnectPopup(true);
        return;
      }

      try {
        const isAdmin = await ContractRead.admins(address);
        if (isAdmin) {
          router.push("/admin");
        }
      } catch (err) {
        console.error("Admin check failed:", err);
      } finally {
        setCheckingAdmin(false);
      }
    }

    checkAdmin();
  }, [isConnected, address, router]);

  /* ------------------ LOAD CAPSULES ------------------ */
  async function loadCapsules() {
    try {
      setLoading(true);

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL ||
          process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
      );

      const contract = ContractRead.connect(provider);
      const nextId = await contract.nextId();
      const total = Number(nextId);

      const list = [];

      for (let id = 0; id < total; id++) {
        const capsule = await contract.capsules(id);
        const cid = capsule.cid;

        let meta = {
          title: `Capsule #${id}`,
          description: "",
        };

        try {
          const res = await fetch(
            `https://ipfs.io/ipfs/${cid}/metadata.json`
          );
          if (res.ok) meta = await res.json();
        } catch {}

        list.push({ id, cid, meta });
      }

      setCapsules(list);
    } catch (err) {
      console.error("Failed loading capsules:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checkingAdmin && isConnected) {
      loadCapsules();
    }
  }, [checkingAdmin, isConnected]);

  /* ------------------ LOADING SCREEN ------------------ */
  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-cyan-400 rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />

      {/* ------------------ CONNECT WALLET POPUP ------------------ */}
     
      {/* ------------------ MAIN DASHBOARD ------------------ */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 text-transparent bg-clip-text">
            Dashboard
          </h1>
          <p className="text-gray-400">
            Overview of Land Records
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="text-center">
              <div className="animate-spin h-14 w-14 border-b-2 border-cyan-400 rounded-full mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                Loading Records...
              </p>
            </div>
          </div>
        ) : capsules.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-gray-400 text-lg">
              No records found
            </p>
          </div>
        ) : (
          <CapsuleTable capsules={capsules} />
        )}
      </main>

      <Footer />
    </div>
  );
}
