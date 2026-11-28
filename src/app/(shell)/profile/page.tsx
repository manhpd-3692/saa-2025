import { redirect } from "next/navigation";
import { getViewerId } from "@/features/profile/load-profile-page";
import { parseProfileFilter } from "@/features/profile/profile-api";
import { ProfilePageView } from "@/features/profile/profile-page-view";

// Per-request Go reads with the viewer's token; the shell may render only the recovery step (N06).
export const instant = false;

/**
 * F007 A1 Profile bản thân `/profile` (Figma 362:5037), opened from the
 * avatar menu (FR-101). `?filter=sent` shows the sent list; anything else the
 * received one (FR-401, D004).
 */
export default async function OwnProfilePage({ searchParams }: { searchParams: Promise<{ filter?: string | string[] }> }) {
  const [{ filter }, viewerId] = await Promise.all([searchParams, getViewerId()]);
  if (!viewerId) redirect(`/login?next=${encodeURIComponent("/profile")}`);
  return <ProfilePageView userId={viewerId} filter={parseProfileFilter(filter)} returnPath="/profile" />;
}
