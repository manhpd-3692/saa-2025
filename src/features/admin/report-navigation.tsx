"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useTransition, type ReactNode } from "react";

interface ReportNavigation {
  /** Client navigation to another report address (range, filters, page). */
  navigate: (href: string) => void;
  /** Reloads the current report (Retry). */
  reload: () => void;
  /** True while the next report is being read: the table dims and Export waits. */
  pending: boolean;
}

const ReportNavigationContext = createContext<ReportNavigation | null>(null);

/**
 * The applied range and filters live in the address (technical-spec § 4.3), so
 * every change is a navigation that re-reads Go on the server. One transition
 * covers them all, so the loading state (SCR § 5) shows wherever it is read.
 */
export function ReportNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The actions stay the same functions while `pending` flips, so effects that use them do not re-run.
  const actions = useMemo(
    () => ({
      navigate: (href: string) => startTransition(() => router.push(href, { scroll: false })),
      reload: () => startTransition(() => router.refresh()),
    }),
    [router],
  );
  const value = useMemo<ReportNavigation>(() => ({ ...actions, pending }), [actions, pending]);
  return <ReportNavigationContext value={value}>{children}</ReportNavigationContext>;
}

export function useReportNavigation(): ReportNavigation {
  const value = useContext(ReportNavigationContext);
  if (!value) throw new Error("useReportNavigation must be used inside <ReportNavigationProvider>");
  return value;
}

/** Wraps a report table: dimmed and `aria-busy` while the next one loads. */
export function ReportBusyRegion({ children }: { children: ReactNode }) {
  const { pending } = useReportNavigation();
  return (
    <div aria-busy={pending} className={`transition-opacity ${pending ? "pointer-events-none opacity-50" : ""}`}>
      {children}
    </div>
  );
}
