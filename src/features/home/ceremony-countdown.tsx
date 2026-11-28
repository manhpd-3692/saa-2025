"use client";

import { useEffect, useState } from "react";
import { CountdownDisplay } from "@/features/countdown/countdown-display";
import type { CountdownCopy } from "@/features/countdown/countdown-copy";
import { useCountdown } from "@/features/countdown/use-countdown";
import { getCurrentEventFromBrowser } from "@/lib/events/events-api";

/**
 * F004 A2 ceremony mode (Codex R08): counts to `ceremonyAt` on the server clock
 * with F003's shared `useCountdown` and `CountdownDisplay`. It never navigates
 * and never reads the event `status` (the site is already open while the
 * ceremony is still ahead). At zero every unit reads 00 and the shared clock
 * stops ticking (DEC-001). When the tab is shown again it re-reads only
 * `serverNow` to correct the clock offset (SC-009); a failed read keeps counting.
 */
export function CeremonyCountdown(props: { ceremonyAt: string; serverNow: string; copy: CountdownCopy }) {
  const [serverNow, setServerNow] = useState(props.serverNow);
  const { remainingMs, ...parts } = useCountdown(props.ceremonyAt, serverNow);
  const stopped = remainingMs <= 0;

  useEffect(() => {
    if (stopped) return; // the post-zero state never changes
    let resyncing = false;
    const resync = async () => {
      if (document.visibilityState !== "visible" || resyncing) return;
      resyncing = true;
      try {
        setServerNow((await getCurrentEventFromBrowser()).serverNow);
      } catch {
        // Go unreachable: keep counting on the offset we already have.
      } finally {
        resyncing = false;
      }
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
    };
  }, [stopped]);

  return <CountdownDisplay parts={parts} copy={props.copy} />;
}
