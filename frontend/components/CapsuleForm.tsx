"use client";

import { useState } from "react";
import { ethers, type Eip1193Provider } from "ethers";
import { useAccount } from "wagmi";

import CapsuleABI from "@/abi/CapsuleRegistry.json";
import { uploadFolderToIPFS } from "@/lib/ipfs";
import { generateQRCodeDataURL, getCapsuleURL } from "@/lib/qrcode";

/* ---------------------- CONFIG ---------------------- */
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const ACCEPTED_TYPES = "image/*,.pdf,.doc,.docx";

/**
 * CreateCapsule Component
 * -----------------------
 * This component allows admin users to create a "capsule" consisting of:
 * - Title
 * - Description
 * - Land documents (files)
 * - Payment proofs (files)
 * 
 * Features:
 * - Upload multiple files to IPFS
 * - Generate QR code for capsule after creation
 * - Robust error handling for blockchain, wallet, and IPFS issues
 * - Prevents accidental non-admin creation attempts
 * - Fully compatible with Ethers v6
 */
export default function CreateCapsule() {
  const { address, isConnected } = useAccount();

  /* ---------------------- STATE ---------------------- */
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [landFiles, setLandFiles] = useState<File[]>([]);
  const [payFiles, setPayFiles] = useState<File[]>([]);

  const [capsuleId, setCapsuleId] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  /* ---------------------- FILE HANDLERS ---------------------- */
  const attachFiles =
    (setter: React.Dispatch<React.SetStateAction<File[]>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setter((prev) => [...prev, ...files]);
    };

  const removeFile =
    (setter: React.Dispatch<React.SetStateAction<File[]>>) =>
    (index: number) => {
      setter((prev) => prev.filter((_, i) => i !== index));
    };

  /* ---------------------- SUBMIT FLOW ---------------------- */
  const submit = async () => {
    if (!isConnected) return alert("Please connect your wallet first.");
    if (!title.trim()) return alert("Title is required.");
    if (landFiles.length === 0 && payFiles.length === 0)
      return alert("Upload at least one document or payment proof.");

    setLoading(true);
    setError(null);

    try {
      /* -------------------- 1. Upload Files to IPFS -------------------- */
      const cid = await uploadFolderToIPFS({
        title,
        description: desc,
        landFiles,
        paymentProofs: payFiles,
      });

      /* -------------------- 2. Initialize Blockchain -------------------- */
      if (!window.ethereum) throw new Error("MetaMask not detected.");

      const ethereumProvider = window.ethereum as Eip1193Provider;
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CapsuleABI.abi, signer);

      /* -------------------- 3. Transaction: Create Capsule -------------------- */
      const tx = await contract.createCapsule(cid);
      const receipt = await tx.wait();
      console.log("Receipt logs:", receipt.logs);


      /* -------------------- 4. Decode CapsuleCreated Event -------------------- */
     let createdId: number | null = null;

for (const log of receipt.logs) {
  let parsed = null;
  try {
    parsed = contract.interface.parseLog(log);
  } catch {
    continue; // skip logs that don't match ABI
  }

  // ✅ Check parsed is not null before using it
  if (parsed && parsed.name === "CapsuleCreated" && parsed.args) {
    createdId = Number(parsed.args.capsuleId);
    break;
  }
}

if (createdId === null) throw new Error("CapsuleCreated event not found or invalid");

      setCapsuleId(createdId);

      /* -------------------- 5. Generate QR Code -------------------- */
      const url = getCapsuleURL(createdId);
      const qr = await generateQRCodeDataURL(url);
      setQrUrl(qr);

      alert("Capsule created successfully!");

    } catch (err: any) {
      console.error("Create Capsule Error:", err);
      setError(err?.message || "Transaction failed.");
      alert(err?.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------- UI ---------------------- */
  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-3xl font-bold mb-6">Create Capsule</h2>

      <div className="flex flex-col gap-4">

        {/* Title Input */}
        <input
          type="text"
          className="p-3 border rounded-lg bg-black text-white"
          placeholder="Capsule Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Description */}
        <textarea
          className="p-3 border rounded-lg bg-black text-white"
          placeholder="Description (optional)"
          rows={4}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        {/* Land Documents */}
        <div>
          <p className="font-semibold mb-1">Land Documents</p>
          <input
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            onChange={attachFiles(setLandFiles)}
          />
          {landFiles.length > 0 && (
            <ul className="mt-2">
              {landFiles.map((file, i) => (
                <li key={i} className="flex justify-between">
                  {file.name}
                  <button
                    className="text-red-500"
                    onClick={() => removeFile(setLandFiles)(i)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payment Proofs */}
        <div>
          <p className="font-semibold mb-1">Payment Proofs</p>
          <input
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            onChange={attachFiles(setPayFiles)}
          />
          {payFiles.length > 0 && (
            <ul className="mt-2">
              {payFiles.map((file, i) => (
                <li key={i} className="flex justify-between">
                  {file.name}
                  <button
                    className="text-red-500"
                    onClick={() => removeFile(setPayFiles)(i)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit Button */}
        <button
          disabled={loading}
          onClick={submit}
          className="mt-4 p-3 rounded-lg bg-blue-600 text-white font-semibold"
        >
          {loading ? "Creating..." : "Create Capsule"}
        </button>

        {/* QR Result */}
        {qrUrl && capsuleId !== null && (
          <div className="mt-6 p-4 border rounded-xl bg-black text-white text-center">
            <h3 className="text-lg mb-2">Capsule Created</h3>
            <p>ID: {capsuleId}</p>
            <img src={qrUrl} alt="QR Code" className="mx-auto my-3 w-40" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <p className="text-red-500 mt-2 font-semibold">Error: {error}</p>
        )}
      </div>
    </div>
  );
}
