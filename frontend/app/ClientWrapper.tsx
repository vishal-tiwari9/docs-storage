"use client";

import { Providers } from "./providers";
import AdminRedirect from "../components/AdminRedirect";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminRedirect />
      {children}
    </Providers>
  );
}
