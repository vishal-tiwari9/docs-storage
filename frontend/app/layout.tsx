
"use client";

import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

const ClientWrapper = dynamic(() => import("./ClientWrapper")
    , { ssr: false }
);

// ----------------------------
// 1️⃣ Metadata
// ----------------------------
 const metadata: Metadata = {
  title: "Docs-Storage Platform",
  description: "Docs Storage Platform",
};

// ----------------------------
// 2️⃣ Root Layout
// ----------------------------
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
