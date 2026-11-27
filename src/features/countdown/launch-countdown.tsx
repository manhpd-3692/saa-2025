"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentEventFromBrowser } from "@/lib/events/events-api";
import { CountdownDisplay } from "./countdown-display";
import type { CountdownCopy } from "./countdown-copy";
import { useCountdown } from "./use-countdown";

const HOMEPAGE_PATH = "/";

/**
 * F003 A4 launch mode (Codex R08): counts to `startAt` on the server clock and
 * moves the visitor to the Homepage with a client navigation (no full reload,
 * FR-403) when the remaining time reaches 0 ms (not when the digits first read
 * 00 00 00, D001), or as soon as a resync on tab refocus reports the event
 * `active` (SC-009). A resync that still says `upcoming` corrects the clock
 * offset and the target. A failed resync keeps counting on the last offset.
 */
export function LaunchCountdown(props: { startAt: string; serverNow: string; copy: CountdownCopy }) {
  const router = useRouter();
  const [reading, setReading] = useState({ startAt: props.startAt, serverNow: props.serverNow });
  const { remainingMs, ...parts } = useCountdown(reading.startAt, reading.serverNow);
  const reachedZero = remainingMs <= 0;
  const handedOver = useRef(false);

  // SM-001 Counting -> Complete, once.
  const handOver = useCallback(() => {
    if (handedOver.current) return;
    handedOver.current = true;
    router.replace(HOMEPAGE_PATH);
  }, [router]);

  useEffect(() => {
    if (reachedZero) handOver();
  }, [reachedZero, handOver]);

  useEffect(() => {
    let resyncing = false;
    const resync = async () => {
      if (document.visibilityState !== "visible" || resyncing) return;
      resyncing = true;
      try {
        const event = await getCurrentEventFromBrowser();
        if (event.status === "active") handOver();
        else setReading({ startAt: event.startAt, serverNow: event.serverNow });
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
  }, [handOver]);

  return <CountdownDisplay parts={parts} copy={props.copy} />;
}
