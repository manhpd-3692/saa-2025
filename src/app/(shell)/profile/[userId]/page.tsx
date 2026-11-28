import { notFound, redirect } from "next/navigation";
import { getViewerId } from "@/features/profile/load-profile-page";
import { ownProfilePath, parseProfileFilter, parseUserIdParam } from "@/features/profile/profile-api";
import { ProfilePageView } from "@/features/profile/profile-page-view";

// Per-request Go reads with the viewer's token; the shell may render only the recovery step (N06).
export const instant = false;

/**
 * F007 A2 Profile người khác `/profile/[userId]` (Figma 362:5097), opened from
 * a kudo card avatar (FR-102). A non-uuid id is not-found at once, the
 * viewer's own id goes to `/profile` with the filter kept (DEC-001), and an
 * id Go does not know is not-found too (FR-104).
 */
export default async function OtherProfilePage({ params, searchParams }: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const [{ userId }, { filter }] = await Promise.all([params, searchParams]);
  const id = parseUserIdParam(userId);
  if (!id) notFound();
  const chosen = parseProfileFilter(filter);
  if ((await getViewerId()) === id) redirect(ownProfilePath(filter === undefined ? null : chosen));
  return <ProfilePageView userId={id} filter={chosen} returnPath={`/profile/${id}`} />;
}
