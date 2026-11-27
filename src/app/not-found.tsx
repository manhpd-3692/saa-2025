import type { Metadata } from "next";
import { NotFoundPage } from "@/components/errors/not-found-page";
import { MinimalChrome } from "@/components/shell/minimal-chrome";

export const metadata: Metadata = { title: "404 · Sun* Annual Awards 2025" };

/**
 * Root not-found (F001 A8): every unmatched URL, signed in or not, gets the 404
 * page in the minimal chrome with no `/me` call (Codex R07, C01). Pages not
 * built yet (for example a footer link target) land here too.
 */
export default function NotFound() {
  return (
    <MinimalChrome>
      <NotFoundPage />
    </MinimalChrome>
  );
}
