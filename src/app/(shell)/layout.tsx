import type { ReactNode } from "react";

// Structural skeleton for the main shell (header/footer chrome arrives in Phase 3).
export default function ShellLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
