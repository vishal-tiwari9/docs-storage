import { ContractRead } from "@/lib/contract";
import { fetchMetadataFromIPFS } from "@/lib/ipfs";

export interface CapsuleListItem {
  id: number;
  cid: string;
  createdAt: number;
  meta: {
    title: string;
    description: string;
  };
  documentCount: number;
}

export async function loadAllCapsules(): Promise<CapsuleListItem[]> {
  const nextId = await ContractRead.nextId();
  const total = Number(nextId);

  // ⚠️ PARALLEL FETCH — NOT SEQUENTIAL
  const capsules = await Promise.all(
    Array.from({ length: total }).map(async (_, id) => {
      try {
        const capsule = await ContractRead.capsules(id);
        const cid = capsule.cid;

        const metadata = await fetchMetadataFromIPFS(cid);

        return {
          id,
          cid,
          createdAt: metadata.createdAt || capsule.createdAt || Date.now(),
          meta: {
            title: metadata.title || `Record #${id}`,
            description: metadata.description || "-",
          },
          documentCount:
            (metadata.landAllotmentFiles?.length || 0) +
            (metadata.paymentProofFiles?.length || 0),
        };
      } catch (err) {
        console.error("Failed to load capsule", id, err);

        // HARD FALLBACK — NEVER BREAK UI
        return {
          id,
          cid: "",
          createdAt: Date.now(),
          meta: {
            title: `Record #${id}`,
            description: "Metadata unavailable",
          },
          documentCount: 0,
        };
      }
    })
  );

  return capsules;
}
