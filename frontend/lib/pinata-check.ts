/**
 * Helper to check if Pinata is configured
 */

export function checkPinataConfig(): { configured: boolean; message: string } {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  
  if (!jwt || jwt.trim() === "") {
    return {
      configured: false,
      message: "Pinata JWT not configured. Please:\n" +
        "1. Create a .env.local file in the frontend folder\n" +
        "2. Add: NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here\n" +
        "3. Get your JWT token from https://app.pinata.cloud/\n" +
        "4. Restart your dev server (npm run dev)"
    };
  }
  
  return {
    configured: true,
    message: "Pinata JWT is configured"
  };
}

