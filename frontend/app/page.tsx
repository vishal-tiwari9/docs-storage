"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ContractRead } from "@/lib/contract";
import CONTRACT_ABI_JSON from "@/abi/CapsuleRegistry.json";






const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_ABI = Array.isArray(CONTRACT_ABI_JSON)
  ? CONTRACT_ABI_JSON
  : CONTRACT_ABI_JSON.abi || CONTRACT_ABI_JSON;


export default function HomePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check if user is admin and redirect
  useEffect(() => {
    async function checkAdmin() {
      if (!isConnected || !address) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const isAdmin = await ContractRead.admins(address);
        if (isAdmin) {
          router.push("/admin");
        }
      } catch (e) {
        console.error("Error checking admin:", e);
      } finally {
        setCheckingAdmin(false);
      }
    }

    checkAdmin();
  }, [isConnected, address, router]);

  async function loadCapsules() {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
      );

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const nextId = await contract.nextId();
      const total = Number(nextId);

      const list = [];

      for (let id = 0; id < total; id++) {
        const capsule = await contract.capsules(id);
        const cid = capsule.cid;
// 
        let meta ={ title:`Capsule id ${id}`, description: " " };
        try {
          const url = `https://ipfs.io/ipfs/${cid}/metadata.json`;
          const res = await fetch(url);
          if (res.ok) {
            meta = await res.json();
          }
        } catch (e) {
          console.error(`Failed to load metadata for capsule ${id}:`, e);
        }

        list.push({
          id,
          cid,
          meta,
        });
      }

      setCapsules(list);
    } catch (err) {
      console.error("Error loading capsules:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checkingAdmin) {
      loadCapsules();
    }
  }, [checkingAdmin]);

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#06080d] via-[#0b0c10] to-[#050608] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p>Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06080d] via-[#0b0c10] to-[#050608] text-white">
      <Header />

    <main className="max-w-7xl mx-auto px-4 py-12">
  <div className="mb-8">
    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 text-transparent bg-clip-text">
      Document Storage Platform
    </h1>
    <p className="text-gray-400">
      View all land allocation documents and payment proofs
    </p>
  </div>

  {loading ? (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-gray-400 text-lg">Loading capsules...</p>
      </div>
    </div>
  ) : capsules.length === 0 ? (
    <div className="text-center py-32">
      <p className="text-gray-400 text-lg">No capsules found</p>
    </div>
  ) : (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {capsules.map((c) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => router.push(`/capsule/${c.id}`)}
          className="bg-black/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/20 transition cursor-pointer"
        >
          {/* TITLE */}
         <h3 className="text-xl font-semibold mb-2 text-cyan-400">
                  {c.meta?.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {c.meta?.description}
                </p>

          {/* INFO ROW */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <span className="text-xs text-gray-500">
              Capsule ID: {c.id}
            </span>

            <span className="text-cyan-400 text-sm font-medium flex items-center gap-1">
              View
              <span className="text-lg">→</span>
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  )}
</main>


    
    </div>
  );
}

