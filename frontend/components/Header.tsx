"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="w-full border-b bg-[#003366] backdrop-blur-md sticky top-0 z-50 text-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between py-4 px-4">
        {/* Logo */}
        <Link href="/">
          <img src="/logo.png" alt="Maharashtra Industrial Development Corporation" />
        </Link>

        

        {/* Wallet Connect */}
        <div className="flex items-center gap-4">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
