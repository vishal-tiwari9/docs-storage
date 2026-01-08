"use client";

import { useEffect, useState } from "react";
import { ethers, type Eip1193Provider } from "ethers";
import { useParams } from "next/navigation";

import CapsuleABI from "@/abi/CapsuleRegistry.json";
import {
  fetchMetadataFromIPFS,
  updateCapsuleInIPFS,
} from "@/lib/ipfs";
import Header from "@/components/Header";

/* ---------------- CONFIG ---------------- */
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const ACCEPTED_TYPES = "image/*,.pdf,.doc,.docx";

/* ---------------- REUSABLE UPLOAD BOX ---------------- */
function UploadBox({
  label,
  files,
  setFiles,
}: {
  label: string;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}) {
  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <p className="font-semibold mb-2 text-gray-700">{label}</p>

      <label className="flex flex-col items-center justify-center w-full h-40 cursor-pointer rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition">
        <p className="text-blue-700 font-semibold">Click to Upload</p>
        <p className="text-xs text-gray-500 mt-1">
          Files will be appended to blockchain record
        </p>

        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={addFiles}
        />
      </label>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li
              key={i}
              className="flex justify-between items-center rounded-md border px-3 py-2 text-sm bg-white"
            >
              <span className="truncate max-w-[80%]">{file.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-red-500 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function UpdateCapsule() {
  const params = useParams();
  const capsuleId = params.id as string;

  /* ---------- VIEW STATE ---------- */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [existingLandDocs, setExistingLandDocs] = useState<any[]>([]);
  const [existingPaymentDocs, setExistingPaymentDocs] = useState<any[]>([]);

  /* ---------- APPEND STATE ---------- */
  const [newLandFiles, setNewLandFiles] = useState<File[]>([]);
  const [newPaymentFiles, setNewPaymentFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- LOAD CAPSULE ---------------- */
  useEffect(() => {
    async function loadCapsule() {
      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as Eip1193Provider
        );

        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CapsuleABI.abi,
          provider
        );

        const capsule = await contract.getCapsule(BigInt(capsuleId));
        const cid = capsule[0];

        const metadata = await fetchMetadataFromIPFS(cid);

        setTitle(metadata.title ?? "");
        setDescription(metadata.description ?? "");

        setExistingLandDocs(metadata.landAllotmentFiles ?? []);
        setExistingPaymentDocs(metadata.paymentProofFiles ?? []);
      } catch (err) {
        console.error(err);
        setError("Failed to load capsule data");
      }
    }

    loadCapsule();
  }, [capsuleId]);

  /* ---------------- SUBMIT APPEND ---------------- */
  const submit = async () => {
    if (newLandFiles.length === 0 && newPaymentFiles.length === 0) {
      alert("Please upload at least one new document");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(
        window.ethereum as Eip1193Provider
      );
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CapsuleABI.abi,
        signer
      );

      const capsule = await contract.getCapsule(BigInt(capsuleId));
      const oldCid = capsule[0];

      const newCid = await updateCapsuleInIPFS(
        oldCid,
        newLandFiles,
        newPaymentFiles
      );

      await contract.updateCapsule(BigInt(capsuleId), newCid);

      alert("Documents appended successfully");
      setNewLandFiles([]);
      setNewPaymentFiles([]);
    } catch (err: any) {
      setError(err?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-6">
          Update Record <span className="text-gray-500">#{capsuleId}</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="bg-white p-6 rounded-xl shadow space-y-4">
            <input disabled value={title} className="w-full p-3 bg-gray-100" />
            <textarea disabled value={description} rows={4} className="w-full p-3 bg-gray-100" />
            <p className="text-xs text-gray-500">🔒 Metadata is immutable</p>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold mb-3">Existing Documents</h3>

              {[...existingLandDocs, ...existingPaymentDocs].length === 0 && (
                <p className="text-sm text-gray-500">No documents found</p>
              )}

              <ul className="space-y-2">
                {[...existingLandDocs, ...existingPaymentDocs].map((doc, i) => (
                  <li key={i} className="flex justify-between border px-3 py-2 text-sm">
                    <span>{doc.path.split("/").pop()}</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      On-Chain
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow space-y-6">
              <UploadBox
                label="Land Allotment Documents"
                files={newLandFiles}
                setFiles={setNewLandFiles}
              />

              <UploadBox
                label="Payment Proofs"
                files={newPaymentFiles}
                setFiles={setNewPaymentFiles}
              />

              <button
                onClick={submit}
                disabled={loading}
                className="w-full py-3 bg-blue-900 text-white rounded-lg"
              >
                {loading ? "Updating..." : "Append Documents"}
              </button>

              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
