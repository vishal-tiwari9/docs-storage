"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CapsuleForm from "@/components/CapsuleForm";

export default function CreateCapsulePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06080d] via-[#0b0c10] to-[#050608] text-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-500 via-emerald-400 to-teal-400 text-transparent bg-clip-text">
            Create New Capsule
          </h1>
          <p className="text-gray-400">
            Upload land allocation letters and payment proofs
          </p>
        </div>

        <CapsuleForm />
      </main>

      <Footer />
    </div>
  );
}

