"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";

import CapsuleABI from "@/abi/CapsuleRegistry.json";
import { uploadFolderToIPFS } from "@/lib/ipfs";
import { generateQRCodeDataURL, getCapsuleURL } from "@/lib/qrcode";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const ACCEPTED_TYPES = "image/*,.pdf,.doc,.docx";

export default function CreateCapsule() {
  const { address, isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const [landFiles, setLandFiles] = useState<File[]>([]);
  const [payFiles, setPayFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [capsuleId, setCapsuleId] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  /* ------------------------- FILE UTILS ------------------------- */
  const attachFiles =
    (setter: React.Dispatch<React.SetStateAction<File[]>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setter((prev) => [...prev, ...files]);
    };

  const removeFile =
    (setter: React.Dispatch<React.SetStateAction<File[]>>) =>
    (i: number) => {
      setter((prev) => prev.filter((_, idx) => idx !== i));
    };

  /* ---------------------- MAIN SUBMIT FLOW ---------------------- */
  const submit = async () => {
    if (!isConnected) return alert("Connect wallet first");
    if (!title.trim()) return alert("Title is required");
    if (landFiles.length === 0 && payFiles.length === 0)
      return alert("Upload at least 1 file");

    try {
      setLoading(true);

      /* -------------------- 1. Upload Folder -------------------- */
      const cid = await uploadFolderToIPFS({
        title,
        description: desc,
        landFiles,
        paymentProofs: payFiles,
      });

      /* -------------------- 2. Prepare Contract -------------------- */
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CapsuleABI.abi,
        signer
      );

      /* -------------------- 3. Admin Check -------------------- */
      const isAdmin = await contract.admins(await signer.getAddress());
      if (!isAdmin) {
        return alert("You are not an admin. Only admins can create capsules.");
      }

      /* ------------------ 4. Create Capsule ------------------- */
      const tx = await contract.createCapsule(cid); // MetaMask handles gas
      const receipt = await tx.wait();

      const id = Number(receipt.logs[0].args.capsuleId);
      setCapsuleId(id);

      /* ------------------ 5. QR Code Generation ------------------- */
      const url = getCapsuleURL(id);
      const qr = await generateQRCodeDataURL(url);
      setQrUrl(qr);

      alert("Capsule created successfully!");

    } catch (err: any) {
      console.error("Create Capsule Error:", err);
      alert(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- UI --------------------------- */
  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-3xl font-bold mb-6">Create Capsule</h2>

      <div className="flex flex-col gap-4">

        {/* Title */}
        <input
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

        {/* Land Files */}
        <div>
          <p className="font-semibold mb-1">Land Documents</p>
          <input type="file" multiple accept={ACCEPTED_TYPES} onChange={attachFiles(setLandFiles)} />
          {landFiles.length > 0 && (
            <ul className="mt-2">
              {landFiles.map((f, i) => (
                <li key={i} className="flex justify-between">
                  {f.name}
                  <button
                    className="text-red-500"
                    onClick={() => removeFile(setLandFiles)(i)}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payment Files */}
        <div>
          <p className="font-semibold mb-1">Payment Proofs</p>
          <input type="file" multiple accept={ACCEPTED_TYPES} onChange={attachFiles(setPayFiles)} />
          {payFiles.length > 0 && (
            <ul className="mt-2">
              {payFiles.map((f, i) => (
                <li key={i} className="flex justify-between">
                  {f.name}
                  <button
                    className="text-red-500"
                    onClick={() => removeFile(setPayFiles)(i)}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit */}
        <button
          disabled={loading}
          onClick={submit}
          className="mt-4 p-3 rounded-lg bg-blue-600 text-white font-semibold"
        >
          {loading ? "Creating..." : "Create Capsule"}
        </button>

        {/* QR Result */}
        {qrUrl && (
          <div className="mt-6 p-4 border rounded-xl bg-black text-white text-center">
            <h3 className="text-lg mb-2">Capsule Created</h3>
            <p>ID: {capsuleId}</p>
            <img src={qrUrl} alt="QR Code" className="mx-auto my-3 w-40" />
          </div>
        )}
      </div>
    </div>
  );
}
