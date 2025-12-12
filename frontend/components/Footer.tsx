"use client";

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 bg-black/40 backdrop-blur-md mt-12">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between text-gray-400 text-sm">
          <p>© 2024 Document Storage Platform</p>
          <p className="mt-2 md:mt-0">
            Powered by IPFS & Blockchain
          </p>
        </div>
      </div>
    </footer>
  );
}

