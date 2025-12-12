"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import CONTRACT_ABI_JSON from "@/abi/CapsuleRegistry.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_ABI = Array.isArray(CONTRACT_ABI_JSON)
  ? CONTRACT_ABI_JSON
  : CONTRACT_ABI_JSON.abi || CONTRACT_ABI_JSON;

export default function AdminPanel() {
  const router = useRouter();
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      const list: any[] = [];

      for (let id = 0; id < total; id++) {
        const capsule = await contract.capsules(id);
        const cid = capsule.cid;

        let meta = {
          title: `Capsule #${id}`,
          description: "No metadata found",
        };

        try {
          const url = `https://ipfs.io/ipfs/${cid}/metadata.json`;
          const res = await fetch(url);
          if (res.ok) {
            meta = await res.json();
          } else {
            console.warn("metadata.json missing for capsule", id);
          }
        } catch (err) {
          console.warn("Failed fetching metadata:", err);
        }

        list.push({
          id,
          cid,
          meta,
        });
      }

      setCapsules(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCapsules();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06080d] via-[#0b0c10] to-[#050608] text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Admin Navbar */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/create-capsule")}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              + Create Capsule
            </button>
            <button
              onClick={() => router.push("/admin/add-admin")}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              + Add Admin
            </button>
          </div>

          <Link
            href="/"
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Page Title */}
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 text-transparent bg-clip-text">
          Admin Dashboard
        </h1>
        <p className="text-gray-400 mb-8">Manage all capsules and admins</p>

        {/* Capsules List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading capsules...</p>
            </div>
          </div>
        ) : capsules.length === 0 ? (
          <div className="text-center py-20 bg-black/40 rounded-xl border border-gray-800">
            <p className="text-gray-400 text-lg mb-4">No capsules found</p>
            <button
              onClick={() => router.push("/admin/create-capsule")}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Create First Capsule
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capsules.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-gray-800 hover:border-cyan-500 transition"
              >
                <h3 className="text-xl font-semibold mb-2 text-cyan-400">
                  {c.meta?.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {c.meta?.description}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/capsule/${c.id}`)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    View
                  </button>

                  <button
                    onClick={() =>
                      router.push(`/admin/update-capsule/${c.id}`)
                    }
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
                  >
                    Update
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
