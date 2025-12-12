"use client";

import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UpdateCapsuleForm from "@/components/UpdateCapsuleForm";

export default function UpdateCapsulePage() {
  const params = useParams();
  const router = useRouter();
  const capsuleId = params.id as string;

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
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-500 via-orange-400 to-red-400 text-transparent bg-clip-text">
            Update Capsule #{capsuleId}
          </h1>
          <p className="text-gray-400">
            Add more files to land allocation or payment proof sections
          </p>
        </div>

        <UpdateCapsuleForm />
      </main>

      <Footer />
    </div>
  );
}

