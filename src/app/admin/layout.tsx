import type { ReactNode } from "react";

// Structural skeleton for /admin/* (admin chrome and role gate arrive in Phase 3).
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
