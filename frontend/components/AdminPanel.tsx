"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import CONTRACT_ABI_JSON from "@/abi/CapsuleRegistry.json";
import { ContractRead } from "@/lib/contract";
import { fetchMetadataFromIPFS } from "@/lib/ipfs";

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
      process.env.NEXT_PUBLIC_RPC_URL ||
        process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
    );

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    const nextId = await contract.nextId();
    const total = Number(nextId);

    const list = await Promise.all(
      Array.from({ length: total }).map(async (_, id) => {
        try {
          const capsule = await contract.capsules(id);
          const cid = capsule.cid;

          const metadata = await fetchMetadataFromIPFS(cid);

          return {
            id,
            cid,
            meta: {
              title: metadata.title || `Record #${id}`,
              description: metadata.description || "-",
            },
            landAllotmentFiles: metadata.landAllotmentFiles || [],
            paymentProofFiles: metadata.paymentProofFiles || [],
            createdAt: metadata.createdAt || Date.now(),
          };
        } catch (err) {
          console.error("Failed loading capsule", id, err);

          return {
            id,
            cid: "",
            meta: {
              title: `Record #${id}`,
              description: "View Record to get description",
            },
            landAllotmentFiles: 1,
            paymentProofFiles: 1,
            createdAt: Date.now(),
          };
        }
      })
    );

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
  
  <div className="min-h-screen bg-bgSlate text-gray-900 flex flex-col">
    <Header />

    <main className="max-w-7xl mx-auto w-full px-4 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Dashboard
          </h1>
          <p className="text-xs text-gray-500">
            Overview of land records
          </p>
          
        </div>

        <button
          onClick={() => router.push("/admin/create-capsule")}
          className="inline-flex items-center gap-1  text-white text-xs px-4 py-2 rounded bg-[#002244]"
        >
          + New Record
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-100 border-b">
            <tr className="text-gray-600 uppercase tracking-wide text-[11px]">
              <th className="px-4 py-3 text-left w-[10%]">ID</th>
              <th className="px-4 py-3 text-left w-[30%]">
                Record Name & Zone
              </th>
              <th className="px-4 py-3 text-left w-[15%]">
                Date 
              </th>
               <th className="px-4 py-3 text-left w-[15%]">
               Documents
              </th>
              <th className="px-4 py-3 text-right w-[5%]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-gray-500"
                >
                  Loading records...
                </td>
              </tr>
            ) : capsules.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-gray-500"
                >
                  No records found
                </td>
              </tr>
            ) : (
              capsules.map((c) => (
                <tr
                  key={c.id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 font-semibold text-gray-600">
                    #{c.id}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 text-[13px]">
                      {c.meta?.title}
                    </div>
                    <div className="text-[11px] text-gray-500">
                     {c.meta?.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">
                   {c.createdAt}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">
                    📎 {c.landAllotmentFiles.length + c.paymentProofFiles.length}
                    </td>
                    

                  

                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex border rounded overflow-hidden">
                      <button
                        onClick={() =>
                          router.push(
                            `/admin/update-capsule/${c.id}`
                          )
                        }
                        className="px-2 py-1 hover:bg-gray-100 border-r"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/capsule/${c.id}`)
                        }
                        className="px-2 py-1 hover:bg-gray-100"
                        title="View"
                      >
                        👁️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>

    {/* <Footer /> */}
  </div>
);

 
}
