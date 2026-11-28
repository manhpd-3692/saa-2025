import "server-only";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isApiError } from "@/lib/api/api-error";
import { goApiServer } from "@/lib/api/go-api-server";
import type {
  BoardSidebarData,
  FilterOptions,
  KudoCardData,
  KudoPage,
  SectionResult,
  SpotlightData,
} from "./kudo-card-types";
import { BOARD_PATHS, parseKudoIdParam } from "./kudos-board-api";

/** One server read for a section's first paint; a failure becomes that section's error state (FR-403). */
async function loadSection<T>(path: string): Promise<SectionResult<T>> {
  try {
    return { data: await goApiServer<T>(path) };
  } catch {
    return { error: true };
  }
}

/**
 * A1: the five board reads in parallel with the viewer's Bearer token
 * (no-store). They do not depend on each other, so one failing section
 * never blanks the page.
 */
export async function loadBoardSections() {
  // Request time only: the session read checks the token clock and the data is per viewer.
  await connection();
  const [highlight, filterOptions, spotlight, feed, sidebar] = await Promise.all([
    loadSection<KudoPage>(BOARD_PATHS.highlight({ hashtagId: null, unitId: null })),
    loadSection<FilterOptions>(BOARD_PATHS.filterOptions),
    loadSection<SpotlightData>(BOARD_PATHS.spotlight),
    loadSection<KudoPage>(BOARD_PATHS.feed(null)),
    loadSection<BoardSidebarData>(BOARD_PATHS.sidebar),
  ]);
  return { highlight, filterOptions, spotlight, feed, sidebar };
}

/**
 * A7: one kudo for the detail page or overlay. A param that is not a uuid is
 * not-found at once; Go answers the same 404 for a missing id and a kudo the
 * viewer may not see (BR-006). Both become the not-found page (SC-006); other
 * failures show Retry.
 */
export async function loadKudoDetail(idParam: string): Promise<SectionResult<KudoCardData>> {
  const id = parseKudoIdParam(idParam);
  if (!id) notFound();
  await connection();
  try {
    return { data: await goApiServer<KudoCardData>(BOARD_PATHS.kudo(id)) };
  } catch (error) {
    if (isApiError(error) && error.status === 404) notFound();
    return { error: true };
  }
}
