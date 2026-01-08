"use client";

import { useState } from "react";
import { ethers, type Eip1193Provider } from "ethers";
import { useAccount } from "wagmi";

import CapsuleABI from "@/abi/CapsuleRegistry.json";
import { uploadFolderToIPFS } from "@/lib/ipfs";
import { generateQRCodeDataURL, getCapsuleURL } from "@/lib/qrcode";

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
  const attachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <p className="font-semibold mb-2 text-gray-700">{label}</p>

      <label className="flex flex-col items-center justify-center w-full h-44 cursor-pointer rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition">
        <div className="flex flex-col items-center">
          <svg
            className="w-10 h-10 mb-2 text-gray-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6H16a4 4 0 010 8m-4-4v6m0 0l-3-3m3 3l3-3"
            />
          </svg>

          <p className="font-semibold text-blue-700">Click to Upload</p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, JPG, PNG (multiple allowed)
          </p>
        </div>

        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={attachFiles}
          className="hidden"
        />
      </label>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-white"
            >
              <span className="truncate max-w-[80%]">{file.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-red-500 hover:text-red-600 text-xs"
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
export default function CreateCapsule() {
  const { isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category] = useState("Land Allotment"); // STATIC

  const [landFiles, setLandFiles] = useState<File[]>([]);
  const [paymentFiles, setPaymentFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [capsuleId, setCapsuleId] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  /* ---------------- SUBMIT ---------------- */
  const submit = async () => {
    if (!isConnected) return alert("Connect wallet first");
    if (!title.trim()) return alert("Record name is required");
    if (landFiles.length === 0 && paymentFiles.length === 0)
      return alert("Upload at least one document");

    setLoading(true);
    setError(null);

    try {
      /* 1. Upload to IPFS */
      const cid = await uploadFolderToIPFS({
        title,
        description: desc,
        landFiles,
        paymentProofs: paymentFiles,
      });

      /* 2. Blockchain */
      if (!window.ethereum) throw new Error("Wallet not found");

      const provider = new ethers.BrowserProvider(
        window.ethereum as Eip1193Provider
      );
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CapsuleABI.abi,
        signer
      );

      const tx = await contract.createCapsule(cid);
      const receipt = await tx.wait();

      let createdId: number | null = null;

      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "CapsuleCreated") {
            createdId = Number(parsed.args.id);
            break;
          }
        } catch {}
      }

      if (createdId === null) throw new Error("CapsuleCreated event missing");

      setCapsuleId(createdId);

      /* 3. QR */
      const url = getCapsuleURL(createdId);
      const qr = await generateQRCodeDataURL(url);
      setQrUrl(qr);

      alert("Record created successfully");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="max-w-3xl mx-auto py-10 bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-blue-900">
          Create New Record
        </h2>

        {/* Record Name + Category */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2">
            <label className="text-sm font-semibold text-gray-600">
              RECORD NAME
            </label>
            <input
              className="mt-1 w-full p-3 border rounded-lg"
              placeholder="e.g. Plot A-45 Allotment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">
              CATEGORY
            </label>
            <select
             
              className="mt-1 w-full p-3 border rounded-lg bg-blue-50 font-medium"
             
            >
              <option>Land Allotment</option>
              <option>Lease Agreement</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-600">
            DESCRIPTION / ZONE
          </label>
          <textarea
            className="mt-1 w-full p-3 border rounded-lg"
            placeholder="e.g. Nagpur Textile Zone"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {/* Documents */}
        <UploadBox
          label="Land Documents"
          files={landFiles}
          setFiles={setLandFiles}
        />

        <div className="mt-6">
          <UploadBox
            label="Payment Proofs"
            files={paymentFiles}
            setFiles={setPaymentFiles}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end mt-8">
          <button
            onClick={submit}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Record"}
          </button>
        </div>

        {/* Result */}
        {qrUrl && capsuleId !== null && (
          <div className="mt-6 p-4 border rounded-xl text-center">
            <p className="font-semibold mb-2">Record Created</p>
            <p>ID: {capsuleId}</p>
            <img src={qrUrl} className="mx-auto mt-3 w-40" />
          </div>
        )}

        {error && (
          <p className="text-red-600 mt-4 font-semibold">Error: {error}</p>
        )}
      </div>
    </div>
  );
}
