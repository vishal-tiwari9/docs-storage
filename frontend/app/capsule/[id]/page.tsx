"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContractRead } from "@/lib/contract";
import { fetchMetadataFromIPFS, CapsuleMetadata, FileReference } from "@/lib/ipfs";
import { generateQRCodeDataURL, getCapsuleURL } from "@/lib/qrcode";
import { useAccount } from "wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface CapsuleData {
  id: number;
  cid: string;
  metadata: CapsuleMetadata;
}

const PUBLIC_GATEWAY = "https://orange-accessible-walrus-501.mypinata.cloud/ipfs";

/**
 * Cleanly extracts path/cid/url from messy metadata objects
 */
function extractFileInfoRecursive(input: any): { path?: string; cid?: string; url?: string } {
  if (!input) return {};
  if (typeof input === "string") {
    const s = input.trim();
    if (s.startsWith("http") || s.includes("/ipfs/")) return { url: s };
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

  const keysPriority = ["url", "path", "filename", "cid", "hash"];
  for (const key of keysPriority) {
    if (input && typeof input === "object" && key in input) {
      const found = extractFileInfoRecursive(input[key]);
      if (found.path || found.cid || found.url) return found;
    }
  }
  return {};
}

/**
 * Core Logic: Generates the specific Gateway/FolderCID/Filename format
 */
function getPublicIpfsUrlFromInfo(
  fileRef: any,
  parentCid: string,
  metadata: CapsuleMetadata
): string {
  const info = extractFileInfoRecursive(fileRef);

  // 1. If it's already a full URL, just return it or fix the gateway
  if (info.url) {
    if (info.url.includes("/ipfs/")) {
      const cidPath = info.url.split("/ipfs/")[1];
      return `${PUBLIC_GATEWAY}/${cidPath}`;
    }
    return info.url;
  }

  // 2. Extract the clean filename from the path
  const filename = info.path ? info.path.split("/").pop() : "";

  // 3. Determine the best CID to use
  // Priority: Direct CID in file object > Metadata references > Parent Folder CID
  let targetCid = info.cid || "";
  
  if (!targetCid && metadata.fileReferences && info.path) {
    const match = metadata.fileReferences.find((f: FileReference) => f.path === info.path);
    if (match?.cid) targetCid = match.cid;
  }

  if (!targetCid) targetCid = parentCid;

  // 4. Final Construction: gateway/cid/filename
  if (targetCid && filename) {
    return `${PUBLIC_GATEWAY}/${targetCid}/${filename}`;
  }

  // Fallback to just the CID if no filename exists
  return targetCid ? `${PUBLIC_GATEWAY}/${targetCid}` : "#";
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

  const isImageFile = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext || "");
  };

  const isPdfFile = (name: string) => name.toLowerCase().endsWith(".pdf");

  if (loading) return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
      <Footer />
    </div>
  );

  if (error || !capsule) return (
    <div className="min-h-screen bg-[#06080d] text-white">
      <Header />
      <div className="flex items-center justify-center h-screen">
        <p>{error || "Capsule not found"}</p>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-gray-800 flex flex-col">
      <Header />
      <main className="w-full px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-md shadow-sm p-4 h-full">
              {qrCodeUrl && (
                <div className="border border-dashed border-gray-300 rounded-md p-4 text-center mb-4">
                  <img src={qrCodeUrl} alt="QR" className="w-24 h-24 mx-auto" />
                  <div className="mt-2 text-sm font-semibold text-brandNavy">Verified Record</div>
                </div>
              )}
              <h2 className="text-lg font-semibold text-gray-900">{capsule.metadata.title || `Capsule #${capsule.id}`}</h2>
              <div className="text-sm text-gray-500 mb-4">ID: #{capsule.id}</div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="uppercase text-[11px] text-gray-500 font-semibold">Zone / Description</div>
                  <div className="text-gray-900">{capsule.metadata.description || "-"}</div>
                </div>
                <div className="flex justify-between">
                  <div>
                    <div className="uppercase text-[11px] text-gray-500 font-semibold">Created Date</div>
                    <div>{new Date(capsule.metadata.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="uppercase text-[11px] text-gray-500 font-semibold">Status</div>
                    <span className="inline-block px-2 py-1 text-xs border border-green-600 text-green-600 bg-green-50 rounded">Active</span>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className="mt-3">
                  <a href={`/admin/update-capsule/${capsule.id}`} className="block w-full text-center text-sm bg-brandNavy text-white py-2 rounded hover:bg-[#002244]">
                    Update Capsule
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - ATTACHMENTS TABLE */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-md shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold text-brandNavy text-sm">Attached Documents</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-3 text-left">Document Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(capsule.metadata.landAllotmentFiles || []), ...(capsule.metadata.paymentProofFiles || [])].map((fileRef, idx) => {
                      const info = extractFileInfoRecursive(fileRef);
                      const name = info.path?.split("/").pop() || info.url?.split("/").pop() || info.cid || `Document ${idx + 1}`;
                      const url = getPublicIpfsUrlFromInfo(fileRef, capsule.cid, capsule.metadata);
                      
                      const isPDF = isPdfFile(name);
                      const isIMG = isImageFile(name);

                      return (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs border rounded ${
                                isPDF ? "bg-red-50 text-red-600 border-red-200" : 
                                isIMG ? "bg-green-50 text-green-600 border-green-200" : 
                                "bg-blue-50 text-blue-600 border-blue-200"
                              }`}>
                              {isPDF ? "PDF" : isIMG ? "IMG" : "DOC"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">IPFS</td>
                          <td className="px-4 py-3 text-right">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-2 py-1 border text-blue-600 rounded hover:bg-blue-50">
                              ⬇
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}