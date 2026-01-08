"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { CapsuleListItem } from "@/lib/loadAllCapsules";

interface CapsuleTableProps {
  capsules: CapsuleListItem[];
}

export default function CapsuleTable({ capsules }: CapsuleTableProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 border-b">
          <tr className="text-left text-sm font-semibold text-gray-600">
            <th className="px-6 py-4">ID</th>
            <th className="px-6 py-4">RECORD NAME &amp; ZONE</th>
            <th className="px-6 py-4 text-center">DOCUMENTS</th>
            <th className="px-6 py-4">DATE</th>
            <th className="px-6 py-4 text-right">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {capsules.map((c) => (
            <motion.tr
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              onClick={() => router.push(`/capsule/${c.id}`)}
              className="border-b hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-6 py-5 font-medium text-gray-700">
                #{c.id}
              </td>

              <td className="px-6 py-5">
                <div className="font-semibold text-gray-900">
                  {c.meta.title}
                </div>
                <div className="text-sm text-gray-500">
                  {c.meta.description}
                </div>
              </td>

              <td className="px-6 py-5 text-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 text-sm border rounded-full bg-gray-100 text-gray-700">
                  📎 {c.documentCount}
                </span>
              </td>

              <td className="px-6 py-5 text-gray-700">
                {new Date(c.createdAt).toLocaleDateString()}
              </td>

              <td className="px-6 py-5 text-right">
                <button
                  className="p-2 rounded-md border hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/records/${c.id}`);
                  }}
                >
                  👁️
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
