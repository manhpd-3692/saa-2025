import type { ReactNode } from "react";
import { MinimalChrome } from "@/components/shell/minimal-chrome";

/** F001 minimal chrome for Login (DEC-002): language switch and copyright only, no `/me` call. */
export default function MinimalLayout({ children }: { children: ReactNode }) {
  return <MinimalChrome>{children}</MinimalChrome>;
}
