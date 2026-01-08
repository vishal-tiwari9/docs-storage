"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import CONTRACT_ABI_JSON from "@/abi/CapsuleRegistry.json";
import { ContractRead } from "@/lib/contract";
import { updateCapsuleInIPFS, fetchMetadataFromIPFS } from "@/lib/ipfs";
import type { Eip1193Provider } from "ethers";


const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_ABI = Array.isArray(CONTRACT_ABI_JSON)
  ? CONTRACT_ABI_JSON
  : CONTRACT_ABI_JSON.abi || CONTRACT_ABI_JSON;

const ACCEPTED_FILE_TYPES = "image/*,.pdf,.doc,.docx";

export default function UpdateCapsuleForm() {
  const params = useParams();
  const urlCapsuleId = params?.id as string;

  const [capsuleId, setCapsuleId] = useState(urlCapsuleId || "");
  const [newLandFiles, setNewLandFiles] = useState<File[]>([]);
  const [newPaymentFiles, setNewPaymentFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [capsuleTitle, setCapsuleTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCapsuleInfo() {
    const idToUse = urlCapsuleId || capsuleId;
    if (!idToUse) return;

    try {
      const id = BigInt(idToUse);
      const capsuleData = await ContractRead.getCapsule(id);
      const cid = capsuleData[0];

      try {
        const metadata = await fetchMetadataFromIPFS(cid);
        setCapsuleTitle(metadata.title || `Capsule #${idToUse}`);
      } catch {
        setCapsuleTitle(`Capsule #${idToUse}`);
      }

      setError(null);
    } catch {
      setCapsuleTitle(null);
      setError("Capsule not found");
    }
  }

  useEffect(() => {
    if (urlCapsuleId) setCapsuleId(urlCapsuleId);
  }, [urlCapsuleId]);

  useEffect(() => {
    const idToUse = urlCapsuleId || capsuleId;
    if (idToUse) loadCapsuleInfo();
  }, [urlCapsuleId, capsuleId]);

  // FILE HANDLERS
  function handleNewLandFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setNewLandFiles((prev) => [...prev, ...files]);
  }

  function handleNewPaymentFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setNewPaymentFiles((prev) => [...prev, ...files]);
  }

  function removeNewLandFile(index: number) {
    setNewLandFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewPaymentFile(index: number) {
    setNewPaymentFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // -------------------------
  //  FIXED SUBMIT HANDLER
  // -------------------------
  async function submit() {
    if (!capsuleId) {
      alert("Enter capsule ID");
      return;
    }
    if (newLandFiles.length === 0 && newPaymentFiles.length === 0) {
      alert("Add at least one file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const id = BigInt(capsuleId);

      // STEP 1: get existing CID
      const capsule = await ContractRead.getCapsule(id);
      const existingCid = capsule[0];

      // STEP 2: update JSON on IPFS
      const newCid = await updateCapsuleInIPFS(
        existingCid,
        newLandFiles,
        newPaymentFiles
      );
if (!window.ethereum) {
  setError("MetaMask not detected");
  setLoading(false);
  return;
}

     const ethereumProvider = window.ethereum as Eip1193Provider;
      // STEP 3: setup provider
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // STEP 4: STATIC CALL (does it pass?)
      try {
        await contract.updateCapsule.staticCall(id, newCid);
      } catch (err: any) {
        console.error("StaticCall failed:", err);
        throw new Error(
          err?.reason ||
            "Static simulation failed. You may not be admin or capsule is invalid."
        );
      }

      // STEP 5: LEGACY GAS (Amoy required)
    /* Ethers v6 Gas Price Fix */
let gasPrice: bigint;
try {
  const feeData = await provider.getFeeData();
  gasPrice = feeData.gasPrice ?? ethers.parseUnits("50", "gwei");
} catch {
  gasPrice = ethers.parseUnits("50", "gwei");
}


      // STEP 6: send txn
      const tx = await contract.updateCapsule(id, newCid, {
        gasPrice,
        // gasLimit fallback
        gasLimit: 500000n,
      });

      await tx.wait();

      alert("Capsule updated!");

      // reset
      setCapsuleId("");
      setNewLandFiles([]);
      setNewPaymentFiles([]);
      setCapsuleTitle(null);
    } catch (err: any) {
      console.error("Update capsule error:", err);

      const msg =
        err?.info?.error?.message ||
        err?.shortMessage ||
        err?.reason ||
        err?.message ||
        "Failed to update capsule";

      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------
  // UI
  // ---------------------
  return (
    <div className="border p-5 rounded-xl bg-white text-black backdrop-blur-md ">
      <h3 className="text-xl font-semibold mb-4 text-yellow-400">
        Update Existing Capsule
      </h3>

      <div className="space-y-4">
        {!urlCapsuleId && (
          <div>
            <label className="block text-sm font-medium mb-1">Capsule ID *</label>
            <input
              type="number"
              className="border p-2 w-full rounded bg-gray-900 border-gray-700 text-black"
              value={capsuleId}
              onChange={(e) => setCapsuleId(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {capsuleTitle && (
          <div className="p-3 bg-green-900 border border-green-600 rounded-lg">
            <p className="text-sm text-green-300 font-medium">{capsuleTitle}</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-600 rounded-lg">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Land files */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Add New Land Allotment Letters
          </label>
          <input
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleNewLandFilesChange}
            disabled={loading}
          />

          {newLandFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {newLandFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm">{file.name}</span>
                  <button
                    onClick={() => removeNewLandFile(index)}
                    className="text-red-600 text-sm"
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment files */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Add New Payment Proofs
          </label>
          <input
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleNewPaymentFilesChange}
            disabled={loading}
          />

          {newPaymentFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {newPaymentFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm">{file.name}</span>
                  <button
                    onClick={() => removeNewPaymentFile(index)}
                    className="text-red-600 text-sm"
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={submit}
          disabled={
            loading ||
            !capsuleId ||
            (newLandFiles.length === 0 && newPaymentFiles.length === 0)
          }
          className="px-5 py-2 bg-blue-600 text-white rounded mt-5 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Updating..." : "Update Capsule"}
        </button>
      </div>
    </div>
  );
}
