"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CapsuleForm from "@/components/CapsuleForm";

export default function CreateCapsulePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>

          <h1 className="text-4xl font-bold mb-2 text-gray-900">
            Create New Capsule
          </h1>

          <p className="text-gray-600">
            Upload land allocation letters and payment proofs
          </p>
        </div>

        <CapsuleForm />
      </main>

      {/* <Footer /> */}
    </div>
  );
}
