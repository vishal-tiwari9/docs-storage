"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import CONTRACT_ABI_JSON from "@/abi/CapsuleRegistry.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_ABI = Array.isArray(CONTRACT_ABI_JSON)
  ? CONTRACT_ABI_JSON
  : CONTRACT_ABI_JSON.abi || CONTRACT_ABI_JSON;

export default function AddAdminPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAddAdmin() {
    setError(null);
    setSuccess(false);

    if (!window.ethereum) {
      setError("MetaMask not detected");
      return;
    }

    if (!isConnected || !address) {
      setError("Please connect your wallet");
      return;
    }

    if (!newAdminAddress.trim()) {
      setError("Please enter an address");
      return;
    }

    if (!ethers.isAddress(newAdminAddress)) {
      setError("Invalid Ethereum address");
      return;
    }

    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.length < 10) {
      setError("Invalid contract address in env file");
      return;
    }

    setLoading(true);

    try {
      // Always create a fresh provider
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Get signer
      const signer = await provider.getSigner();

      // Ensure signer address matches wallet
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== address.toLowerCase()) {
        setError("Wallet mismatch. Reconnect wallet.");
        setLoading(false);
        return;
      }

      // Connect contract
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // ↑ Critical fix: Amoy hates EIP-1559 → use legacy gas
      const gasEstimate = await contract.addAdmin.estimateGas(newAdminAddress);

      // Apply 20% buffer
      const gasLimit = gasEstimate + gasEstimate / 5n;

      const txOptions = {
        gasLimit,
        // Minimum safe gas price on Amoy
        gasPrice: ethers.parseUnits("30", "gwei"), // stable + accepted everywhere
      };

      // Send TX
      const tx = await contract.addAdmin(newAdminAddress, txOptions);

      await tx.wait();

      setSuccess(true);
      setNewAdminAddress("");

      setTimeout(() => router.push("/admin"), 1500);
    } catch (err: any) {
      console.error("FULL ERROR:", err);

      // Decode real revert reason if possible
      const reason =
        err?.reason ||
        err?.shortMessage ||
        err?.info?.error?.message ||
        err?.data ||
        err?.message ||
        "Transaction failed";

      setError(reason);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#06080d] text-white">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white mb-4">
          ← Back
        </button>

        <h1 className="text-4xl font-bold mb-4">Add New Admin</h1>

        <div className="bg-black/40 p-6 rounded-xl border border-gray-800">
          <label className="block text-sm mb-2">New Admin Address *</label>
          <input
            type="text"
            placeholder="0x..."
            value={newAdminAddress}
            onChange={(e) => setNewAdminAddress(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
          />

          {error && <div className="mt-3 p-3 bg-red-900/30 border border-red-600 rounded">{error}</div>}
          {success && <div className="mt-3 p-3 bg-green-900/30 border border-green-600 rounded">Admin added successfully!</div>}

          <button
            onClick={handleAddAdmin}
            disabled={loading || !isConnected}
            className="w-full mt-5 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-600"
          >
            {loading ? "Processing..." : "Add Admin"}
          </button>

          {!isConnected && <p className="text-yellow-400 text-center mt-3">Connect wallet first</p>}
        </div>
      </main>

      <Footer />
    </div>
  );
}
