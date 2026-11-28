"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Event-unavailable fallback (F004 A1 edge case, Codex R16/R23): shown in place
 * of the countdown and event info when Go has no event row, fails or stalls
 * past 5 s. "Retry" re-renders the route on the server, which reads the event
 * again; the rest of the Homepage is never blocked by it.
 */
export function EventFallbackRetry({ message, retryLabel }: { message: string; retryLabel: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div data-testid="event-fallback" role="status" className="flex min-h-[262px] flex-col items-start justify-center gap-6">
      <p className="text-2xl font-bold leading-8">{message}</p>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="flex h-14 items-center rounded-panel border border-primary-border bg-primary-soft px-6 text-lg font-bold hover:bg-primary-muted disabled:opacity-60"
      >
        {retryLabel}
      </button>
    </div>
  );
}
