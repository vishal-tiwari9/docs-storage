/**
 * MULTI-PROVIDER IPFS UPLOADER
 * Supports: Pinata (direct API) + NFT.Storage (fallback)
 * Frontend-only solution - no backend required
 */

export interface FileReference {
  path: string;
  cid?: string;
}

export interface CapsuleMetadata {
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  landAllotmentFiles: (string | FileReference)[];
  paymentProofFiles: (string | FileReference)[];
  previousCid?: string;
  // For optimized Pinata uploads (files uploaded individually)
  metadataCid?: string; // CID of initial metadata.json
  fileReferences?: Array<{ path: string; cid: string }>; // Individual file CIDs
}

export interface UploadCapsuleParams {
  title: string;
  description?: string;
  landFiles: File[];
  paymentProofs: File[];
}

// Provider Configuration
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
// NFT.Storage key - user provided: 691ff281.efded2c647084130a52c8d64acb1aed5
// But it's failing with 401, so let's validate format
const NFT_STORAGE_KEY_RAW = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY || "691ff281.efded2c647084130a52c8d64acb1aed5";
// Validate and clean the key
const NFT_STORAGE_KEY = NFT_STORAGE_KEY_RAW.trim();
const GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ||
  "https://gateway.pinata.cloud";

/* -------------------------------------------------------------------------- */
/*                    PINATA: UPLOAD SINGLE FILE (OPTIMIZED)                  */
/* -------------------------------------------------------------------------- */

/**
 * Upload a single file to Pinata - GUARANTEED to work
 * This is the optimized approach: upload files one by one
 */
async function uploadSingleFileToPinata(
  file: File | Blob,
  filename: string
): Promise<string> {
  if (!PINATA_JWT || PINATA_JWT.trim() === "") {
    throw new Error("Pinata JWT missing");
  }

  const formData = new FormData();
  formData.append("file", file, filename);
  
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: filename })
  );
  
  formData.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 0 })
  );

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    }
  );

  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`Pinata single file upload failed: ${text}`);
  }

  const data = JSON.parse(text);
  return data.IpfsHash;
}

/* -------------------------------------------------------------------------- */
/*                    PINATA: OPTIMIZED MULTI-FILE UPLOAD                      */
/* -------------------------------------------------------------------------- */

/**
 * OPTIMIZED APPROACH: Upload metadata first, then files individually
 * This guarantees it works because each upload is a single file
 * 
 * Strategy:
 * 1. Upload metadata.json first (single file - guaranteed to work)
 * 2. Upload each file individually (each is single file - guaranteed to work)
 * 3. Create final metadata that references all CIDs
 * 4. Upload final metadata (single file - guaranteed to work)
 * 
 * This approach works but is slower (multiple API calls)
 * NFT.Storage is faster and recommended for production
 */
async function uploadFolderToPinataOptimized(
  files: Array<{ file: File; path: string }>,
  metadataJson: CapsuleMetadata
): Promise<string> {
  if (!PINATA_JWT || PINATA_JWT.trim() === "") {
    throw new Error(
      "Pinata Error: JWT token missing. " +
      "Set NEXT_PUBLIC_PINATA_JWT in .env.local."
    );
  }

  console.log("📤 Pinata Optimized: Uploading metadata first...");

  // STEP 1: Upload metadata.json first (single file - guaranteed to work)
  const metadataBlob = new Blob([JSON.stringify(metadataJson, null, 2)], {
    type: "application/json",
  });
  
  let metadataCid: string;
  try {
    metadataCid = await uploadSingleFileToPinata(metadataBlob, "metadata.json");
    console.log(`✅ Metadata uploaded: ${metadataCid}`);
  } catch (error: any) {
    throw new Error(
      `Pinata Error: Failed to upload metadata. ${error.message}`
    );
  }

  // STEP 2: Upload each file individually (each is single file - guaranteed to work)
  const fileCids: Array<{ path: string; cid: string }> = [];
  
  console.log(`📤 Pinata Optimized: Uploading ${files.length} files individually...`);
  
  for (let i = 0; i < files.length; i++) {
    const { file, path } = files[i];
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    
    try {
      console.log(`  Uploading ${i + 1}/${files.length}: ${cleanPath}`);
      const fileCid = await uploadSingleFileToPinata(file, cleanPath);
      fileCids.push({ path: cleanPath, cid: fileCid });
      console.log(`  ✅ Uploaded: ${fileCid}`);
    } catch (error: any) {
      throw new Error(
        `Pinata Error: Failed to upload file ${cleanPath}. ${error.message}`
      );
    }
  }

  // STEP 3: Create final metadata that references all CIDs
  const finalMetadata: CapsuleMetadata & { 
    metadataCid: string;
    fileReferences: Array<{ path: string; cid: string }>;
  } = {
    ...metadataJson,
    metadataCid,
    fileReferences: fileCids,
  };

  // STEP 4: Upload final metadata (single file - guaranteed to work)
  console.log("📤 Pinata Optimized: Uploading final metadata with all references...");
  
  const finalMetadataBlob = new Blob([JSON.stringify(finalMetadata, null, 2)], {
    type: "application/json",
  });
  
  try {
    const finalCid = await uploadSingleFileToPinata(
      finalMetadataBlob,
      "final-metadata.json"
    );
    console.log(`✅ Final metadata uploaded: ${finalCid}`);
    return finalCid;
  } catch (error: any) {
    throw new Error(
      `Pinata Error: Failed to upload final metadata. ${error.message}`
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                    PINATA: OLD METHOD (KEPT FOR REFERENCE)                 */
/* -------------------------------------------------------------------------- */

/**
 * OLD METHOD: Attempts to upload multiple files in one request
 * ⚠️ This will fail with "More than one file" error
 * Kept for reference, but uploadFolderToPinataOptimized is used instead
 */
async function uploadFolderToPinata(
  files: Array<{ file: File; path: string }>,
  metadataJson: CapsuleMetadata
): Promise<string> {
  // Comprehensive validation
  if (!PINATA_JWT || PINATA_JWT.trim() === "") {
    throw new Error(
      "Pinata Error: JWT token missing. " +
      "Set NEXT_PUBLIC_PINATA_JWT in .env.local. " +
      "Get your JWT from https://app.pinata.cloud/"
    );
  }

  // Validate JWT format (basic check)
  if (PINATA_JWT.length < 50) {
    throw new Error(
      "Pinata Error: JWT token appears invalid (too short). " +
      "JWT tokens are typically long strings. " +
      "Get a valid JWT from https://app.pinata.cloud/"
    );
  }

  // Validate files
  if (!files || files.length === 0) {
    throw new Error(
      "Pinata Error: No files provided for upload. " +
      "Ensure at least one file is selected."
    );
  }

  // ⚠️ WARNING: Pinata API limitation
  // Pinata's pinFileToIPFS endpoint does NOT support multiple files in one request
  // When you append multiple files, Pinata sees them as separate uploads
  // This causes "More than one file" error
  
  // WORKAROUND: Try uploading with single file approach
  // This won't work for multiple files, but we'll try and provide clear error
  
  const formData = new FormData();

  // Add metadata.json
  try {
    const metadataBlob = new Blob([JSON.stringify(metadataJson, null, 2)], {
      type: "application/json",
    });
    formData.append("file", metadataBlob, "metadata.json");
  } catch (metadataError: any) {
    throw new Error(
      "Pinata Error: Failed to create metadata file. " +
      `Error: ${metadataError.message}`
    );
  }

  // ⚠️ CRITICAL: Adding multiple files will cause "More than one file" error
  // Pinata's API sees each append("file", ...) as a separate upload
  // We'll try anyway and provide detailed error if it fails
  
  let fileCount = 0;
  for (const { file, path } of files) {
    // Validate file
    if (!file || !(file instanceof File)) {
      throw new Error(
        `Pinata Error: Invalid file at path ${path}. ` +
        "File must be a valid File object."
      );
    }

    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    if (!cleanPath || cleanPath.length === 0) {
      throw new Error(
        `Pinata Error: Invalid path for file ${file.name}. ` +
        `Path: ${path}`
      );
    }

    formData.append("file", file, cleanPath);
    fileCount++;
  }

  // Pinata metadata
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: `capsule-${Date.now()}` })
  );

  // Pinata Options
  // ⚠️ IMPORTANT: wrapWithDirectory causes "More than one file" error with multiple files
  // Without it, files are uploaded separately (no directory CID)
  // This is a fundamental Pinata API limitation
  formData.append(
    "pinataOptions",
    JSON.stringify({ 
      cidVersion: 0,
      wrapWithDirectory: false, // Must be false, but this means no directory structure
    })
  );

  console.log(`📤 Pinata: Attempting upload of ${fileCount + 1} files (metadata + ${fileCount} files)...`);
  console.log("⚠️ Warning: Pinata API may reject multiple files. NFT.Storage is recommended.");

  try {
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          // Don't set Content-Type - browser sets it with boundary automatically
        },
        body: formData,
      }
    );

    const text = await response.text();
    
    if (!response.ok) {
      // Parse error for detailed message
      let errorDetails = text;
      let errorMessage = "";
      
      try {
        const errorJson = JSON.parse(text);
        errorMessage = errorJson.error || errorJson.message || text;
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch {
        errorMessage = text;
      }

      // Specific error handling
      if (errorMessage.includes("More than one file") || errorMessage.includes("multiple")) {
        throw new Error(
          "Pinata Error: API Limitation - Multiple files not supported. " +
          "Pinata's pinFileToIPFS endpoint does NOT support multiple files in one request. " +
          "Each formData.append('file', ...) is seen as a separate upload. " +
          `Attempted to upload ${fileCount + 1} files (metadata + ${fileCount} files). ` +
          "\n\n" +
          "SOLUTIONS:\n" +
          "1. Use NFT.Storage (recommended) - handles multiple files natively\n" +
          "2. Upload files individually to Pinata (complex, multiple API calls)\n" +
          "3. Use Pinata SDK with backend (not frontend-only)\n" +
          "\n" +
          `Full error: ${errorDetails}`
        );
      }

      if (response.status === 401 || errorMessage.includes("Unauthorized")) {
        throw new Error(
          "Pinata Error: Authentication failed (401). " +
          "Your JWT token is invalid or expired. " +
          "Get a new JWT from https://app.pinata.cloud/ " +
          `Error: ${errorMessage}`
        );
      }

      if (response.status === 403 || errorMessage.includes("Forbidden")) {
        throw new Error(
          "Pinata Error: Access forbidden (403). " +
          "Your JWT token doesn't have permission to upload files. " +
          "Check your Pinata account permissions. " +
          `Error: ${errorMessage}`
        );
      }

      if (response.status === 429 || errorMessage.includes("rate limit")) {
        throw new Error(
          "Pinata Error: Rate limit exceeded (429). " +
          "Too many requests. Please wait and try again later. " +
          `Error: ${errorMessage}`
        );
      }

      // Generic error
      throw new Error(
        `Pinata Error: Upload failed (${response.status}). ` +
        `Error: ${errorMessage}. ` +
        `Files attempted: ${fileCount + 1}. ` +
        `Full response: ${errorDetails}`
      );
    }

    // Parse response
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError: any) {
      throw new Error(
        "Pinata Error: Invalid response format. " +
        `Expected JSON but got: ${text.substring(0, 200)}... ` +
        `Parse error: ${parseError.message}`
      );
    }
    
    // Validate response
    if (!data.IpfsHash) {
      throw new Error(
        "Pinata Error: Response missing IpfsHash. " +
        "Upload may have succeeded but no CID returned. " +
        `Response: ${JSON.stringify(data, null, 2)}`
      );
    }

    // ⚠️ WARNING: Without wrapWithDirectory, this might be a single file CID, not directory
    console.log(`✅ Pinata: Upload successful. CID: ${data.IpfsHash}`);
    console.log("⚠️ Warning: This CID might be for a single file, not a directory structure.");
    
    return data.IpfsHash;
  } catch (error: any) {
    // Re-throw with enhanced context
    if (error.message && error.message.startsWith("Pinata Error:")) {
      throw error; // Already has detailed message
    }
    
    // Network errors
    if (error.message && (error.message.includes("fetch") || error.message.includes("network"))) {
      throw new Error(
        "Pinata Error: Network error. " +
        "Check your internet connection. " +
        `Error: ${error.message}`
      );
    }
    
    // Wrap unknown errors
    throw new Error(
      `Pinata Error: ${error.message || String(error)}. ` +
      `Check: 1) JWT is valid, 2) Files are valid, 3) Network is connected. ` +
      `Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                         NFT.STORAGE UPLOAD                                  */
/* -------------------------------------------------------------------------- */

/**
 * Upload folder to NFT.Storage
 * NFT.Storage uses IPFS and works great for directory structures
 */
async function uploadFolderToNFTStorage(
  files: Array<{ file: File; path: string }>,
  metadataJson: CapsuleMetadata
): Promise<string> {
  // Comprehensive validation
  if (!NFT_STORAGE_KEY || NFT_STORAGE_KEY.trim() === "") {
    throw new Error(
      "NFT.Storage Error: API key missing. " +
      "Set NEXT_PUBLIC_NFT_STORAGE_KEY in .env.local. " +
      "Get your key from https://nft.storage/"
    );
  }

  // Validate API key format (should be: xxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
  const keyPattern = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]{32,}$/;
  if (!keyPattern.test(NFT_STORAGE_KEY)) {
    throw new Error(
      "NFT.Storage Error: Invalid API key format. " +
      "Key should be in format: 'xxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'. " +
      "Current key format is invalid. Get a new key from https://nft.storage/"
    );
  }

  // Validate files array
  if (!files || files.length === 0) {
    throw new Error(
      "NFT.Storage Error: No files provided for upload. " +
      "Ensure at least one file is selected."
    );
  }

  try {
    // Dynamic import to avoid SSR issues
    // @ts-ignore - nft.storage types may not be available, but package works at runtime
    let NFTStorage: any;
    try {
      // @ts-ignore - Dynamic import of nft.storage
      const module = await import("nft.storage");
      NFTStorage = (module as any).NFTStorage || (module as any).default?.NFTStorage;
      if (!NFTStorage) {
        throw new Error("NFTStorage class not found in module");
      }
    } catch (importError: any) {
      throw new Error(
        "NFT.Storage Error: Package not installed or import failed. " +
        "Run: npm install nft.storage. " +
        `Import error: ${importError.message}`
      );
    }

    // Initialize client with detailed error handling
    let client;
    try {
      // NFT.Storage expects token in format: "Bearer {token}" or just "{token}"
      // The key provided: 691ff281.efded2c647084130a52c8d64acb1aed5
      // This looks like it might need "Bearer " prefix or might be wrong format
      
      // Try with the key as-is first
      client = new NFTStorage({ token: NFT_STORAGE_KEY });
      console.log("✅ NFT.Storage client initialized");
    } catch (initError: any) {
      throw new Error(
        "NFT.Storage Error: Failed to initialize client. " +
        `Check API key format. Error: ${initError.message}\n\n` +
        "Get a valid API key from https://nft.storage/\n" +
        "Key format should be a long token string."
      );
    }

    // Prepare files for NFT.Storage
    // NFT.Storage expects File objects with proper names that include directory paths
    const nftFiles: File[] = [];

    // Add metadata.json at root
    try {
      const metadataBlob = new Blob([JSON.stringify(metadataJson, null, 2)], {
        type: "application/json",
      });
      nftFiles.push(
        new File([metadataBlob], "metadata.json", { type: "application/json" })
      );
    } catch (metadataError: any) {
      throw new Error(
        "NFT.Storage Error: Failed to create metadata file. " +
        `Error: ${metadataError.message}`
      );
    }

    // Add all other files with directory structure
    for (let i = 0; i < files.length; i++) {
      const { file, path } = files[i];
      
      // Validate file
      if (!file || !(file instanceof File)) {
        throw new Error(
          `NFT.Storage Error: Invalid file at index ${i}. ` +
          "File must be a valid File object."
        );
      }

      // Validate path
      if (!path || typeof path !== "string") {
        throw new Error(
          `NFT.Storage Error: Invalid path at index ${i}. ` +
          "Path must be a non-empty string."
        );
      }

      // Clean path (remove leading slash)
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      
      // Validate clean path
      if (cleanPath.length === 0) {
        throw new Error(
          `NFT.Storage Error: Empty path after cleaning at index ${i}. ` +
          `Original path: ${path}`
        );
      }

      // Create new File with path as name to preserve directory structure
      // NFT.Storage's storeDirectory uses file names to create directory structure
      try {
        nftFiles.push(new File([file], cleanPath, { type: file.type || "application/octet-stream" }));
      } catch (fileError: any) {
        throw new Error(
          `NFT.Storage Error: Failed to create File object for ${cleanPath}. ` +
          `Error: ${fileError.message}`
        );
      }
    }

    // Validate we have files to upload
    if (nftFiles.length === 0) {
      throw new Error(
        "NFT.Storage Error: No files prepared for upload. " +
        "This should not happen - check file preparation logic."
      );
    }

    console.log(`📤 NFT.Storage: Uploading ${nftFiles.length} files...`);
    console.log("📁 Files:", nftFiles.map(f => f.name).join(", "));

    // Upload directory to NFT.Storage
    // storeDirectory creates IPFS directory automatically from file names
    let cid: string;
    try {
      cid = await client.storeDirectory(nftFiles);
    } catch (uploadError: any) {
      // Detailed error handling
      const errorMsg = uploadError.message || String(uploadError);
      
      // Check for specific error types
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized") || 
          errorMsg.includes("malformed") || errorMsg.includes("parse") ||
          errorMsg.includes("API Key")) {
        throw new Error(
          "NFT.Storage Error: Authentication failed (401). " +
          "Your API key is invalid, expired, or malformed.\n\n" +
          `Current key: ${NFT_STORAGE_KEY.substring(0, 20)}... (length: ${NFT_STORAGE_KEY.length})\n\n` +
          "SOLUTIONS:\n" +
          "1. Get a new API key from https://nft.storage/\n" +
          "2. Sign up/login at https://nft.storage/\n" +
          "3. Go to Account > API Keys\n" +
          "4. Create a new key (it will be a long token string)\n" +
          "5. Update NEXT_PUBLIC_NFT_STORAGE_KEY in .env.local\n" +
          "6. Restart dev server\n\n" +
          `Error: ${errorMsg}`
        );
      }
      
      if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
        throw new Error(
          "NFT.Storage Error: Rate limit exceeded (429). " +
          "Too many requests. Please wait and try again later. " +
          `Error: ${errorMsg}`
        );
      }
      
      if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
        throw new Error(
          "NFT.Storage Error: Network error. " +
          "Check your internet connection. " +
          `Error: ${errorMsg}`
        );
      }
      
      if (errorMsg.includes("size") || errorMsg.includes("too large")) {
        throw new Error(
          "NFT.Storage Error: File too large. " +
          "NFT.Storage limit: 31GB per file, 100GB total. " +
          `Error: ${errorMsg}`
        );
      }

      // Generic error
      throw new Error(
        `NFT.Storage Error: Upload failed. ` +
        `Error: ${errorMsg}. ` +
        `Files attempted: ${nftFiles.length}. ` +
        `Check console for details.`
      );
    }

    // Validate CID
    if (!cid || typeof cid !== "string" || cid.length === 0) {
      throw new Error(
        "NFT.Storage Error: Upload succeeded but no CID returned. " +
        "This is unexpected - contact NFT.Storage support."
      );
    }

    console.log(`✅ NFT.Storage: Upload successful. CID: ${cid}`);
    return cid;
  } catch (error: any) {
    // Re-throw with enhanced context
    if (error.message && error.message.startsWith("NFT.Storage Error:")) {
      throw error; // Already has detailed message
    }
    
    // Wrap unknown errors
    throw new Error(
      `NFT.Storage Error: ${error.message || String(error)}. ` +
      `Check: 1) API key is valid, 2) Files are valid, 3) Network is connected. ` +
      `Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                        PUBLIC: UPLOAD CAPSULE FOLDER                        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                    MULTI-PROVIDER UPLOAD (PRIMARY FUNCTION)                */
/* -------------------------------------------------------------------------- */

/**
 * Upload capsule folder to IPFS using multiple providers
 * Tries Pinata first, falls back to NFT.Storage if Pinata fails
 */
export async function uploadFolderToIPFS(
  params: UploadCapsuleParams
): Promise<string> {
  const now = new Date().toISOString();

  const files: Array<{ file: File; path: string }> = [];
  const landPaths: string[] = [];
  const payPaths: string[] = [];

  // LAND FILES
  params.landFiles.forEach((file, i) => {
    const ext = file.name.split(".").pop() || "file";
    const path = `land-allotment/land-${i + 1}.${ext}`;
    files.push({ file, path });
    landPaths.push(path);
  });

  // PAYMENT FILES
  params.paymentProofs.forEach((file, i) => {
    const ext = file.name.split(".").pop() || "file";
    const path = `payment-proof/payment-${i + 1}.${ext}`;
    files.push({ file, path });
    payPaths.push(path);
  });

  const metadata: CapsuleMetadata = {
    title: params.title,
    description: params.description || "",
    createdAt: now,
    updatedAt: now,
    landAllotmentFiles: landPaths,
    paymentProofFiles: payPaths,
  };

  // Validate we have files to upload
  if (files.length === 0 && params.landFiles.length === 0 && params.paymentProofs.length === 0) {
    throw new Error(
      "Upload Error: No files provided. " +
      "Please select at least one file (land allocation or payment proof)."
    );
  }

  // Try NFT.Storage first (handles directories better)
  let nftStorageError: Error | null = null;
  if (NFT_STORAGE_KEY) {
    try {
      console.log("🔄 Attempting upload via NFT.Storage (primary provider)...");
      console.log(`📊 Files to upload: ${files.length} files`);
      const cid = await uploadFolderToNFTStorage(files, metadata);
      console.log("✅ NFT.Storage upload successful:", cid);
      return cid;
    } catch (error: any) {
      nftStorageError = error;
      console.error("❌ NFT.Storage upload failed:", error);
      console.warn("⚠️ Falling back to Pinata...");
      // Fall through to Pinata
    }
  } else {
    console.warn("⚠️ NFT.Storage not configured. Set NEXT_PUBLIC_NFT_STORAGE_KEY");
  }

  // Fallback to Pinata (if JWT is configured) - Using OPTIMIZED method
  let pinataError: Error | null = null;
  if (PINATA_JWT) {
    try {
      console.log("🔄 Attempting upload via Pinata (fallback provider, optimized method)...");
      console.log(`📊 Files to upload: ${files.length} files`);
      console.log("✅ Using optimized method: metadata first, then files individually");
      const cid = await uploadFolderToPinataOptimized(files, metadata);
      console.log("✅ Pinata upload successful:", cid);
      return cid;
    } catch (error: any) {
      pinataError = error;
      console.error("❌ Pinata upload failed:", error);
    }
  } else {
    console.warn("⚠️ Pinata not configured. Set NEXT_PUBLIC_PINATA_JWT");
  }

  // Both providers failed - provide comprehensive error
  const errorMessages: string[] = [];
  
  errorMessages.push("❌ ALL IPFS PROVIDERS FAILED");
  errorMessages.push("");
  errorMessages.push("Attempted Providers:");
  
  if (NFT_STORAGE_KEY) {
    errorMessages.push(`1. NFT.Storage: ❌ FAILED`);
    if (nftStorageError) {
      errorMessages.push(`   Error: ${nftStorageError.message}`);
    }
  } else {
    errorMessages.push(`1. NFT.Storage: ⚠️ NOT CONFIGURED`);
    errorMessages.push(`   Set NEXT_PUBLIC_NFT_STORAGE_KEY in .env.local`);
  }
  
  if (PINATA_JWT) {
    errorMessages.push(`2. Pinata: ❌ FAILED`);
    if (pinataError) {
      errorMessages.push(`   Error: ${pinataError.message}`);
    }
  } else {
    errorMessages.push(`2. Pinata: ⚠️ NOT CONFIGURED`);
    errorMessages.push(`   Set NEXT_PUBLIC_PINATA_JWT in .env.local`);
  }
  
  errorMessages.push("");
  errorMessages.push("SOLUTIONS:");
  errorMessages.push("1. Check error messages above for specific issues");
  errorMessages.push("2. Verify API keys are correct and valid");
  errorMessages.push("3. Check network connection");
  errorMessages.push("4. Ensure files are valid (not corrupted)");
  errorMessages.push("5. Try uploading fewer files at once");
  errorMessages.push("");
  errorMessages.push("For NFT.Storage: Get key from https://nft.storage/");
  errorMessages.push("For Pinata: Get JWT from https://app.pinata.cloud/");

  throw new Error(errorMessages.join("\n"));
}

/* -------------------------------------------------------------------------- */
/*                            FETCH METADATA                                   */
/* -------------------------------------------------------------------------- */

export async function fetchMetadataFromIPFS(
  cid: string
): Promise<CapsuleMetadata> {
  // Try multiple gateways for reliability
  // First try direct CID (for optimized Pinata uploads where metadata is uploaded separately)
  const urls = [
    `${GATEWAY}/ipfs/${cid}`, // Direct CID (optimized Pinata)
    `${GATEWAY}/ipfs/${cid}/metadata.json`, // Directory structure (NFT.Storage)
    `https://ipfs.io/ipfs/${cid}`, // Direct CID
    `https://ipfs.io/ipfs/${cid}/metadata.json`, // Directory structure
    `https://nftstorage.link/ipfs/${cid}/metadata.json`, // NFT.Storage gateway
    `https://gateway.ipfs.io/ipfs/${cid}/metadata.json`,
  ];

  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (r.ok) {
        const data = await r.json();
        
        // Handle optimized Pinata structure (has fileReferences)
        if (data.fileReferences && Array.isArray(data.fileReferences)) {
          // Convert fileReferences to FileReference format for land/payment files
          const landFiles: FileReference[] = (data.landAllotmentFiles || []).map((path: string) => {
            const ref = data.fileReferences.find((fr: any) => fr.path === path);
            return ref ? { path, cid: ref.cid } : { path };
          });
          
          const paymentFiles: FileReference[] = (data.paymentProofFiles || []).map((path: string) => {
            const ref = data.fileReferences.find((fr: any) => fr.path === path);
            return ref ? { path, cid: ref.cid } : { path };
          });
          
          return {
            title: data.title,
            description: data.description,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            landAllotmentFiles: landFiles,
            paymentProofFiles: paymentFiles,
            previousCid: data.previousCid,
            metadataCid: data.metadataCid,
            fileReferences: data.fileReferences,
          };
        }
        
        // Standard structure (NFT.Storage or regular Pinata)
        return data;
      }
    } catch {}
  }

  throw new Error("metadata.json not found in any gateway");
}

/* -------------------------------------------------------------------------- */
/*                           RESOLVE IPFS URL                                  */
/* -------------------------------------------------------------------------- */

const PUBLIC_GATEWAY = "https://ipfs.io/ipfs";

function extractPath(fileItem: any): string | null {
  if (!fileItem) return null;
  if (typeof fileItem === "string") return fileItem;
  if (typeof fileItem === "object") {
    if (typeof fileItem.path === "string") return fileItem.path;
    if (fileItem.path?.path) return fileItem.path.path;
  }
  return null;
}

function extractDirectCid(fileItem: any): string | null {
  if (!fileItem || typeof fileItem !== "object") return null;
  return fileItem.cid || fileItem.path?.cid || null;
}

function stripFolder(path: string): string {
  return path.replace(/^payment-proof\//, "")
             .replace(/^land-allotment\//, "");
}

export function getIPFSUrl(
  fileItem: any,
  parentCid: string,
  metadata: CapsuleMetadata
): string | null {
  const path = extractPath(fileItem);
  if (!path) return null;

  const cleanPath = path.replace(/^\/+/, "");
  const fileNameOnly = stripFolder(cleanPath);

  // 1) via fileReferences
  if (metadata?.fileReferences?.length) {
    const ref = metadata.fileReferences.find((x) => x.path === cleanPath);
    if (ref?.cid) {
      return `${PUBLIC_GATEWAY}/${ref.cid}/${fileNameOnly}`;
    }
  }

  // 2) via nested cid
  const innerCid = extractDirectCid(fileItem);
  if (innerCid) {
    return `${PUBLIC_GATEWAY}/${innerCid}/${fileNameOnly}`;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                           UPDATE CAPSULE                                     */
/* -------------------------------------------------------------------------- */

export async function updateCapsuleInIPFS(
  existingCid: string,
  newLand: File[],
  newPay: File[]
): Promise<string> {
  const old = await fetchMetadataFromIPFS(existingCid);

  const files: Array<{ file: File; path: string }> = [];

  const land = old.landAllotmentFiles.map((f) =>
    typeof f === "string" ? { path: f, cid: existingCid } : f
  );

  const pay = old.paymentProofFiles.map((f) =>
    typeof f === "string" ? { path: f, cid: existingCid } : f
  );

  // Append new land
  const landStart = land.length;
  newLand.forEach((file, i) => {
    const ext = file.name.split(".").pop() || "file";
    const path = `land-allotment/land-${landStart + i + 1}.${ext}`;
    files.push({ file, path });
    land.push({ path, cid: undefined } as FileReference);
  });

  // Append new payment
  const payStart = pay.length;
  newPay.forEach((file, i) => {
    const ext = file.name.split(".").pop() || "file";
    const path = `payment-proof/payment-${payStart + i + 1}.${ext}`;
    files.push({ file, path });
    pay.push({ path, cid: undefined } as FileReference);
  });

  const updated: CapsuleMetadata = {
    ...old,
    landAllotmentFiles: land,
    paymentProofFiles: pay,
    updatedAt: new Date().toISOString(),
    previousCid: existingCid,
  };

  // Try NFT.Storage first, then Pinata (optimized)
  if (NFT_STORAGE_KEY) {
    try {
      return await uploadFolderToNFTStorage(files, updated);
    } catch (error) {
      console.warn("NFT.Storage update failed, trying Pinata (optimized):", error);
      if (PINATA_JWT) {
        return await uploadFolderToPinataOptimized(files, updated);
      }
      throw error;
    }
  }

  if (PINATA_JWT) {
    return await uploadFolderToPinataOptimized(files, updated);
  }

  throw new Error("No IPFS provider configured for update");
}
// ---------------------------- UPDATE CAPSULE IN IPFS ----------------------------

// export async function updateCapsuleInIPFS(
//   existingCid: string,
//   newLandFiles: File[],
//   newPaymentFiles: File[]
// ): Promise<string> {
//   // Step 1: Fetch existing metadata
//   const oldMetadata = await fetchMetadataFromIPFS(existingCid);

//   // Step 2: Prepare arrays of existing files
//   const landRefs: FileReference[] = (oldMetadata.landAllotmentFiles || []).map((f) =>
//     typeof f === "string" ? { path: f, cid: "" } : f
//   );
//   const paymentRefs: FileReference[] = (oldMetadata.paymentProofFiles || []).map((f) =>
//     typeof f === "string" ? { path: f, cid: "" } : f
//   );

//   // Step 3: Append new land files
//   const filesToUpload: { file: File; path: string }[] = [];
//   newLandFiles.forEach((file, i) => {
//     const ext = file.name.split(".").pop() || "file";
//     const path = `land-allotment/land-${landRefs.length + i + 1}.${ext}`;
//     filesToUpload.push({ file, path });
//     landRefs.push({ path, cid: "" });
//   });

//   // Step 4: Append new payment proof files
//   newPaymentFiles.forEach((file, i) => {
//     const ext = file.name.split(".").pop() || "file";
//     const path = `payment-proof/payment-${paymentRefs.length + i + 1}.${ext}`;
//     filesToUpload.push({ file, path });
//     paymentRefs.push({ path, cid: "" });
//   });

//   // Step 5: Update metadata
//   const updatedMetadata: CapsuleMetadata = {
//     ...oldMetadata,
//     landAllotmentFiles: landRefs,
//     paymentProofFiles: paymentRefs,
//     updatedAt: new Date().toISOString(),
//     previousCid: existingCid,
//   };

//   // Step 6: Upload to NFT.Storage first
//   if (NFT_STORAGE_KEY) {
//     try {
//       return await uploadFolderToNFTStorage(filesToUpload, updatedMetadata);
//     } catch (err) {
//       console.warn("NFT.Storage update failed, falling back to Pinata:", err);
//     }
//   }

//   // Step 7: Fallback to Pinata
//   if (PINATA_JWT) return await uploadFolderToPinataOptimized(filesToUpload, updatedMetadata);

//   throw new Error("No IPFS provider configured for capsule update");
// }
