import type { ReactNode } from "react";

// Structural skeleton for chrome-less pages such as Login (chrome arrives in Phase 3).
export default function MinimalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
