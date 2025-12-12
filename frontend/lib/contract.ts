import { ethers } from "ethers";
import ABI_JSON from "@/abi/CapsuleRegistry.json";

 export const RPC = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || process.env.NEXT_PUBLIC_RPC_URL!;
export const READ_PROVIDER = new ethers.JsonRpcProvider(RPC);
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

// Extract ABI from JSON (it's nested as {abi: [...]})
 export const ABI = Array.isArray(ABI_JSON) ? ABI_JSON : (ABI_JSON as any).abi || ABI_JSON;

export const ContractRead = new ethers.Contract(CONTRACT_ADDRESS, ABI, READ_PROVIDER);
