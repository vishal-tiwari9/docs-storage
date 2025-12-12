"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="w-full border-b bg-black/80 backdrop-blur-md sticky top-0 z-50 text-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between py-4 px-4">
        {/* Logo */}
        <Link href="/">
          <span className="text-2xl font-semibold">Docs Storage </span>
        </Link>

        

        {/* Wallet Connect */}
        <div className="flex items-center gap-4">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
