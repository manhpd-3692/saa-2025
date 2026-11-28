import type { KudoStatus } from "./moderation-api";

/** Figma 722:16251: Public in a blue outline, Spam in a yellow one. */
const TONE: Record<KudoStatus, string> = {
  public: "border-[#3f6fe0] text-[#3f6fe0]",
  spam: "border-notice-warning text-notice-warning",
};

/** The Status column pill (FR-101); the label is translated by the caller. */
export function StatusPill({ status, label }: { status: KudoStatus; label: string }) {
  return (
    <span
      data-testid="status-pill"
      data-status={status}
      className={`inline-flex h-9 min-w-[72px] items-center justify-center rounded-control border px-3 text-sm ${TONE[status]}`}
    >
      {label}
    </span>
  );
}
