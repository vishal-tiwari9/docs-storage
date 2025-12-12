/**
 * QR Code Generation Utilities
 */

import QRCode from "qrcode";

/**
 * Generate QR code as data URL (for img src)
 */
export async function generateQRCodeDataURL(url: string): Promise<string> {
  try {
    const dataURL = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return dataURL;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(url: string): Promise<string> {
  try {
    const svg = await QRCode.toString(url, {
      type: "svg",
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return svg;
  } catch (error) {
    console.error("Error generating QR code SVG:", error);
    throw error;
  }
}

/**
 * Download QR code as image
 */
export async function downloadQRCode(url: string, filename: string = "qrcode.png"): Promise<void> {
  try {
    const dataURL = await generateQRCodeDataURL(url);
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading QR code:", error);
    throw error;
  }
}

/**
 * Get capsule URL for QR code
 */
export function getCapsuleURL(capsuleId: number): string {
  if (typeof window === "undefined") {
    return "";
  }
  return `${window.location.origin}/capsule/${capsuleId}`;
}

