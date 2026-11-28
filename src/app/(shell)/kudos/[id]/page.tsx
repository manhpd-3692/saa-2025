import { KudoDetailOverlay } from "@/features/kudos-board/kudo-detail-overlay";
import { loadKudoDetail } from "@/features/kudos-board/load-board-sections";

// Per-request Go read with the viewer's token; the shell may render only the recovery step (N06).
export const instant = false;

/**
 * F006 A7 View Kudo opened directly (a copied link, a refresh): the card as a
 * page; Đóng opens the board. A missing, non-uuid or not-viewable id renders
 * the shell's not-found page (BR-006, SC-006).
 */
export default async function KudoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KudoDetailOverlay result={await loadKudoDetail(id)} mode="page" />;
}
