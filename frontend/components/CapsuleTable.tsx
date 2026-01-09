"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CapsuleMetadata ,FileReference } from "@/lib/ipfs";

interface HybridCapsule {
  id: number;
  cid: string;
  createdAt: string | number;
  landAllotmentFiles: FileReference[];
  paymentProofFiles: FileReference[];
  // The specific nested part
  meta: {
    title: string;
    description: string;
  };
}

interface CapsuleTableProps {
  capsules: HybridCapsule[];
}

export default function CapsuleTable({ capsules }: CapsuleTableProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 border-b">
          <tr className="text-left text-[11px] uppercase tracking-wider font-bold text-gray-500">
            <th className="px-6 py-4">ID</th>
            <th className="px-6 py-4">Record Name & Zone</th>
            <th className="px-6 py-4 text-center">Files</th>
            <th className="px-6 py-4">Created Date</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {capsules.map((c) => {
            // Your helper function ensures these are arrays of objects now
            const docCount = (c.landAllotmentFiles?.length || 0) + 
                             (c.paymentProofFiles?.length || 0) ||2;

            return (
              <motion.tr
                key={c.id}
                whileHover={{ backgroundColor: "#f9fafb" }}
                onClick={() => router.push(`/capsule/${c.id}`)}
                className="group cursor-pointer transition-colors"
              >
                <td className="px-6 py-5 text-sm font-bold text-gray-400">
                  {String(c.id).padStart(3, '0')}
                </td>

                <td className="px-6 py-5">
                  <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {c.meta.title || "Untitled Record"}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-[300px]">
                    {c.meta.description || "view record for details"}
                  </div>
                </td>

                <td className="px-6 py-5 text-center">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                     📎 {c.landAllotmentFiles.length + c.paymentProofFiles.length}
                  </div>
                </td>

                <td className="px-6 py-5 text-sm text-gray-600">
                  {c.createdAt}
                </td>

                <td className="px-6 py-5 text-right">
                  <span className="text-blue-500  font-bold text-lg">
               👁️
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}