"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContractRead } from "@/lib/contract";
import { fetchMetadataFromIPFS, CapsuleMetadata, FileReference } from "@/lib/ipfs";
import { generateQRCodeDataURL, getCapsuleURL, downloadQRCode } from "@/lib/qrcode";
import { useAccount } from "wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface CapsuleData {
  id: number;
  cid: string;
  metadata: CapsuleMetadata;
}

const PUBLIC_GATEWAY = "https://ipfs.io/ipfs";

/**
 * Recursively extract file info: path, cid, url
 */
function extractFileInfoRecursive(input: any): { path?: string; cid?: string; url?: string } {
  if (!input) return {};
  if (typeof input === "string") {
    const s = input.trim();
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("ipfs://") || s.includes("/ipfs/"))
      return { url: s };
    if (s.includes("/")) return { path: s };
    if ((s.startsWith("Qm") && s.length > 20) || s.length >= 46) return { cid: s };
    return { path: s };
  }

  if (Array.isArray(input)) {
    for (const el of input) {
      const found = extractFileInfoRecursive(el);
      if (found.path || found.cid || found.url) return found;
    }
    return {};
  }

  const keysPriority = ["url", "href", "path", "filename", "fileName", "name", "cid", "hash", "ipfs"];
  for (const key of keysPriority) {
    if (key in input) {
      const found = extractFileInfoRecursive((input as any)[key]);
      if (found.path || found.cid || found.url) return found;
    }
  }

  if (input && typeof input === "object" && input.content && typeof input.content === "object" && typeof input.content["/"] === "string") {
    return { cid: input.content["/"] };
  }

  return {};
}

/**
 * Generate IPFS URL for a file
 * @param fileRef - file object or string
 * @param parentCid - fallback CID of capsule
 * @param metadata - capsule metadata
 * @param stripFirstFolder - remove first folder from path? (used for paymentProof)
 */
export function getPublicIpfsUrlFromInfo(
  fileRef: any,
  parentCid: string,
  metadata: CapsuleMetadata,
  stripFirstFolder = false
): string | null {
  const info = extractFileInfoRecursive(fileRef);
  if (!info.path && !info.cid && !info.url) return null;

  // Helper to clean the path
  const cleanPath = (info.path || "").replace(/^\/+/, "");
  const finalPath = stripFirstFolder ? cleanPath.split("/").slice(1).join("/") : cleanPath;

  // 1️⃣ Check metadata.fileReferences first
  if (metadata.fileReferences && info.path) {
    const fileRefEntry = metadata.fileReferences.find((f: FileReference) => f.path === info.path);
    if (fileRefEntry && fileRefEntry.cid) {
      return `${PUBLIC_GATEWAY}/${encodeURIComponent(fileRefEntry.cid)}/${encodeURI(finalPath)}`;
    }
  }

  // 2️⃣ Direct URL handling
  if (info.url) {
    let s = info.url;
    if (s.startsWith("ipfs://")) s = s.replace(/^ipfs:\/\//, "");
    if (s.includes("/ipfs/")) s = s.split("/ipfs/")[1];
    return `${PUBLIC_GATEWAY}/${encodeURI(s)}`;
  }

  // 3️⃣ CID + path fallback
  if (info.cid && info.path) {
    return `${PUBLIC_GATEWAY}/${encodeURIComponent(info.cid)}/${encodeURI(finalPath)}`;
  }

  // 4️⃣ Only path → use parent CID
  if (info.path) {
    return `${PUBLIC_GATEWAY}/${encodeURIComponent(parentCid)}/${encodeURI(finalPath)}`;
  }

  // 5️⃣ Only CID → root
  if (info.cid) return `${PUBLIC_GATEWAY}/${encodeURIComponent(info.cid)}`;

  return null;
}

export default function CapsulePage() {
  const params = useParams();
  const capsuleId = params.id as string;
  const { address, isConnected } = useAccount();
  const [capsule, setCapsule] = useState<CapsuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadCapsule() {
      try {
        setLoading(true);
        const id = BigInt(capsuleId);
        const capsuleData = await ContractRead.getCapsule(id);
        const cid = capsuleData[0];
        const metadata = await fetchMetadataFromIPFS(cid);

        setCapsule({ id: Number(id), cid, metadata });

        const capsuleUrl = getCapsuleURL(Number(id));
        const qrDataUrl = await generateQRCodeDataURL(capsuleUrl);
        setQrCodeUrl(qrDataUrl);
      } catch (err: any) {
        console.error("Error loading capsule:", err);
        setError(err?.message || "Failed to load capsule");
      } finally {
        setLoading(false);
      }
    }

    async function checkAdmin() {
      if (isConnected && address) {
        try {
          const adminStatus = await ContractRead.admins(address);
          setIsAdmin(adminStatus);
        } catch {
          setIsAdmin(false);
        }
      }
    }

    if (capsuleId) {
      loadCapsule();
      checkAdmin();
    }
  }, [capsuleId, isConnected, address]);

  function isImageFile(pathOrName: string): boolean {
    const ext = pathOrName.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "");
  }

  function isPdfFile(pathOrName: string): boolean {
    return pathOrName.toLowerCase().endsWith(".pdf");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#06080d] via-[#0b0c10] to-[#050608] text-white">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p>Loading capsule...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !capsule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#06080d] via-[#0b0c10] to-[#050608] text-white">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-400 text-xl mb-4">Error</p>
            <p className="text-gray-400">{error || "Capsule not found"}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Resolve file URL for land allotment objects (robust)
  function resolveFileUrl(fileRef: any, metadata: CapsuleMetadata) {
    if (!fileRef) return "";

    // 1. Extract the raw path safely (coerce to string)
    let rawPath: string = "";
    if (typeof fileRef === "string") rawPath = fileRef;
    else if (typeof fileRef.path === "string") rawPath = fileRef.path;
    else if (fileRef.path && typeof fileRef.path.path === "string") rawPath = fileRef.path.path;
    else rawPath = "";

    rawPath = rawPath || "";
    if (!rawPath) return "";

    // 2. Extract final filename safely
    const filename = String(rawPath).split("/").pop() || "";
    if (!filename) return "";

    // 3. Extract CID → priority order
    const cidFromField = (typeof fileRef === "object" && (fileRef.cid || fileRef.path?.cid)) || null;
    const cidFromRefs = metadata.fileReferences?.find((f) => f.path === rawPath)?.cid || null;
    const cid = cidFromField || cidFromRefs || "";

    if (!cid) return "";

    // 4. Build public URL
    return `${PUBLIC_GATEWAY}/${encodeURIComponent(cid)}/${encodeURIComponent(filename)}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06080d] via-[#0b0c10] to-[#050608] text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Header info */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 mb-6 border border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 text-transparent bg-clip-text">
                {capsule.metadata.title || `Capsule #${capsule.id}`}
              </h1>
              {capsule.metadata.description && <p className="text-gray-300 mt-3 text-lg">{capsule.metadata.description}</p>}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
                <span>Created: {new Date(capsule.metadata.createdAt).toLocaleDateString()}</span>
                <span>Updated: {new Date(capsule.metadata.updatedAt).toLocaleDateString()}</span>
                <span>CID: {capsule.cid.substring(0, 20)}...</span>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="flex flex-col items-center">
                <div className="bg-white p-2 rounded-lg mb-2">
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                </div>
                <button
                  onClick={() => downloadQRCode(getCapsuleURL(capsule.id), `capsule-${capsule.id}-qrcode.png`)}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Download QR
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <a
                href={`/admin/update-capsule/${capsule.id}`}
                className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
              >
                Update Capsule (Add Files)
              </a>
            </div>
          )}
        </div>

        {/* Land Allotment Letters */}
        {Array.isArray(capsule.metadata.landAllotmentFiles) && capsule.metadata.landAllotmentFiles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-400">Land Allotment Letters</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {capsule.metadata.landAllotmentFiles.map((fileRef, idx) => {
                // Resolve final public URL
                const fileUrl = resolveFileUrl(fileRef, capsule.metadata) || "";

                // Extract filename safely
                let rawPath = "";
                if (typeof fileRef === "string") rawPath = fileRef;
                else if (typeof fileRef.path === "string") rawPath = fileRef.path;
                else if (fileRef.path && typeof fileRef.path.path === "string") rawPath = fileRef.path.path;
                rawPath = rawPath || "";

                const fileName = (String(rawPath).split("/").pop() || `Document-${idx + 1}`);

                return (
                  <div
                    key={idx}
                    className="bg-black/40 backdrop-blur-md rounded-lg p-4 border border-gray-800 hover:border-cyan-500 transition"
                  >
                    {isImageFile(fileName) ? (
                      <>
                        <img
                          src={fileUrl}
                          alt={fileName}
                          className="w-full h-48 object-cover rounded mb-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <a
                          href={fileUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 text-sm block truncate"
                        >
                          {fileName}
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="w-full h-48 bg-gray-800 rounded mb-2 flex items-center justify-center">
                          {isPdfFile(fileName) ? <p className="text-xs text-gray-400">PDF</p> : <p className="text-xs text-gray-400">Document</p>}
                        </div>

                        <a
                          href={fileUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 text-sm block truncate"
                        >
                          {fileName}
                        </a>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Proofs */}
        {Array.isArray(capsule.metadata.paymentProofFiles) && capsule.metadata.paymentProofFiles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-green-400">Payment Proofs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {capsule.metadata.paymentProofFiles.map((fileRef, idx) => {
                const info = extractFileInfoRecursive(fileRef);
                const fileUrlRaw = getPublicIpfsUrlFromInfo(fileRef, capsule.cid, capsule.metadata, false) || "";

                // ⭐ NEW FEATURE: Remove `/payment-proof/` folder but keep filename intact.
                // Safe replace only if fileUrlRaw is non-empty
                const cleanedUrl = fileUrlRaw ? fileUrlRaw.replace("/payment-proof/", "/") : "";

                const fileName =
                  (info.path && info.path.split("/").pop()) ||
                  info.url?.split("/").pop() ||
                  info.cid ||
                  `Document ${idx + 1}`;

                return (
                  <div key={idx} className="bg-black/40 backdrop-blur-md rounded-lg p-4 border border-gray-800 hover:border-green-500 transition">
                    {isImageFile(String(fileName)) ? (
                      <>
                        <img
                          src={cleanedUrl || fileUrlRaw || "#"}
                          alt={String(fileName)}
                          className="w-full h-48 object-cover rounded mb-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <a
                          href={cleanedUrl || fileUrlRaw || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 text-sm block truncate"
                        >
                          {fileName}
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="w-full h-48 bg-gray-800 rounded mb-2 flex items-center justify-center">
                          {isPdfFile(String(fileName)) ? <p className="text-xs text-gray-400">PDF</p> : <p className="text-xs text-gray-400">Document</p>}
                        </div>
                        <a
                          href={cleanedUrl || fileUrlRaw || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 text-sm block truncate"
                        >
                          {fileName}
                        </a>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!capsule.metadata.landAllotmentFiles?.length && !capsule.metadata.paymentProofFiles?.length) && (
          <div className="text-center py-12 text-gray-400">
            <p>No documents in this capsule.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
