import { Suspense } from "react";
import { KudoDetailOverlay } from "@/features/kudos-board/kudo-detail-overlay";
import { loadKudoDetail } from "@/features/kudos-board/load-board-sections";

export const instant = false;

/** The per-request Go read, streamed so the soft navigation is not held by it. */
async function KudoDetailModalContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KudoDetailOverlay result={await loadKudoDetail(id)} mode="overlay" />;
}

/**
 * F006 A7 View Kudo opened from the board (D005): `(.)[id]` intercepts the
 * soft navigation to `/kudos/[id]` and shows the card over the board, which
 * stays mounted underneath, so Đóng returns to the same place (FR-102).
 */
export default function KudoDetailModal({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <KudoDetailModalContent params={params} />
    </Suspense>
  );
}
