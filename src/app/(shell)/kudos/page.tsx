import { AllKudosFeed } from "@/features/kudos-board/all-kudos-feed";
import { BoardSectionHeading } from "@/features/kudos-board/board-section-parts";
import { BoardSidebar } from "@/features/kudos-board/board-sidebar";
import { HighlightCarousel } from "@/features/kudos-board/highlight-carousel";
import { KudosKeyVisual } from "@/features/kudos-board/kudos-key-visual";
import { loadBoardSections } from "@/features/kudos-board/load-board-sections";
import { SpotlightBoard } from "@/features/kudos-board/spotlight-board";
import { getRequestTranslator } from "@/i18n/get-request-translator";

// Per-request Go reads with the viewer's token; the shell may render only the recovery step (N06).
export const instant = false;

/**
 * F006 A1 Sun* Kudos Live board `/kudos` (Figma 2940:13431): key visual,
 * HIGHLIGHT KUDOS, SPOTLIGHT BOARD, then ALL KUDOS beside the sidebar. The
 * five sections are read in parallel on the server for the first paint and
 * then live on their own in the browser (filters, scrolling, refocus, Retry),
 * each with its own loading, empty and error state (FR-403).
 */
export default async function KudosBoardPage() {
  const [{ t }, sections] = await Promise.all([getRequestTranslator("kudos-board"), loadBoardSections()]);
  return (
    <div className="px-36 pb-[120px]">
      <KudosKeyVisual />
      <HighlightCarousel initial={sections.highlight} initialOptions={sections.filterOptions} />
      <SpotlightBoard initial={sections.spotlight} />
      <section aria-labelledby="all-kudos-title" className="mt-[156px]" data-testid="all-kudos-section">
        <BoardSectionHeading id="all-kudos-title" title={t("kudos-board.feed.title")} />
        <div className="mt-10 flex items-start gap-[49px]">
          <div className="w-[680px] shrink-0">
            <AllKudosFeed initial={sections.feed} />
          </div>
          <aside className="sticky top-24 w-[423px] shrink-0">
            <BoardSidebar initial={sections.sidebar} />
          </aside>
        </div>
      </section>
    </div>
  );
}
