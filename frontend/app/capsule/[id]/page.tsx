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
 function getPublicIpfsUrlFromInfo(
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
      <div className="min-h-screen bg-white text-black">
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
  <div className="min-h-screen bg-[#f0f2f5] text-gray-800 flex flex-col">
    <Header />

    <main className="w-full px-8 py-8">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-md shadow-sm p-4 h-full">

            {/* QR BOX */}
            {qrCodeUrl && (
              <div className="border border-dashed border-gray-300 rounded-md p-4 text-center mb-4">
                <img src={qrCodeUrl} alt="QR" className="w-24 h-24 mx-auto" />
                <div className="mt-2 text-sm font-semibold text-brandNavy">
                  Verified Record
                </div>
              </div>
            )}

            {/* TITLE */}
            <h2 className="text-lg font-semibold text-gray-900">
              {capsule.metadata.title || `Capsule #${capsule.id}`}
            </h2>

            <div className="text-sm text-gray-500 mb-4">
              ID: #{capsule.id}
            </div>

            {/* META */}
            <div className="space-y-3 text-sm">
              <div>
                <div className="uppercase text-[11px] text-gray-500 font-semibold">
                  Zone / Description
                </div>
                <div className="text-gray-900">
                  {capsule.metadata.description || "-"}
                </div>
              </div>

              <div className="flex justify-between">
                <div>
                  <div className="uppercase text-[11px] text-gray-500 font-semibold">
                    Created Date
                  </div>
                  <div>
                    {new Date(capsule.metadata.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <div className="uppercase text-[11px] text-gray-500 font-semibold">
                    Status
                  </div>
                  <span className="inline-block px-2 py-1 text-xs border border-green-600 text-green-600 bg-green-50 rounded">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* VERIFY */}
            {/* <div className="mt-5 pt-4 border-t">
              <a
                href={`https://polygonscan.com`}
                target="_blank"
                className="block w-full text-center text-sm border border-blue-600 text-blue-600 py-2 rounded hover:bg-blue-50"
              >
                Verify on PolygonScan
              </a>
            </div> */}

            {/* ADMIN */}
            {isAdmin && (
              <div className="mt-3">
                <a
                  href={`/admin/update-capsule/${capsule.id}`}
                  className="block w-full text-center text-sm bg-brandNavy text-white py-2 rounded hover:bg-[#002244]"
                >
                  Update Capsule
                </a>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-md shadow-sm">

            <div className="border-b px-4 py-3">
              <h3 className="font-semibold text-brandNavy text-sm">
                Attached Documents
              </h3>
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
                  {[...(capsule.metadata.landAllotmentFiles || []),
                    ...(capsule.metadata.paymentProofFiles || [])].map(
                    (fileRef, idx) => {
                      const info = extractFileInfoRecursive(fileRef);
                      const name =
                        info.path?.split("/").pop() ||
                        info.url?.split("/").pop() ||
                        info.cid ||
                        `Document ${idx + 1}`;

                      const url =
                        getPublicIpfsUrlFromInfo(
                          fileRef,
                          capsule.cid,
                          capsule.metadata
                        ) || "#";

                      const isPDF = isPdfFile(String(name));
                      const isIMG = isImageFile(String(name));

                      return (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {name}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs border rounded ${
                                isPDF
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : isIMG
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : "bg-blue-50 text-blue-600 border-blue-200"
                              }`}
                            >
                              {isPDF ? "PDF" : isIMG ? "IMG" : "DOC"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-gray-500">
                            IPFS
                          </td>

                          <td className="px-4 py-3 text-right">
                            <a
                              href={url}
                              target="_blank"
                              className="inline-flex items-center justify-center px-2 py-1 border text-blue-600 rounded hover:bg-blue-50"
                            >
                              ⬇
                            </a>
                          </td>
                        </tr>
                      );
                    }
                  )}
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
