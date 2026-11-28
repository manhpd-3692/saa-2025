import "server-only";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import type { KudoPage, SectionResult } from "@/features/kudos-board/kudo-card-types";
import { isApiError } from "@/lib/api/api-error";
import { goApiServer } from "@/lib/api/go-api-server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { PROFILE_PATHS, type ProfileData, type ProfileFilter } from "./profile-api";

export type ProfilePageData = { profile: ProfileData; firstPage: SectionResult<KudoPage> } | { error: true };

/**
 * The signed-in viewer's user id: the `sub` of the access token, verified
 * against the Supabase JWKS (`getClaims`). Only used to pick the own profile
 * and the DEC-001 redirect; Go decides ownership from the token it verifies.
 */
export async function getViewerId(): Promise<string | null> {
  await connection();
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    return !error && typeof sub === "string" ? sub.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * A1/A2 first paint: the profile and the first page of the chosen list, read
 * in parallel with the viewer's Bearer token (no-store, 5 s). Go 404 → the
 * not-found page (FR-104); 401 → Login; any other profile failure → a retry
 * notice; a failed list → the list's own error state (the header still shows).
 */
export async function loadProfilePage(userId: string, filter: ProfileFilter, returnPath: string): Promise<ProfilePageData> {
  await connection();
  const [profile, firstPage] = await Promise.all([
    goApiServer<ProfileData>(PROFILE_PATHS.profile(userId)).then(
      (data) => ({ data }),
      (error: unknown) => ({ failure: error }),
    ),
    goApiServer<KudoPage>(PROFILE_PATHS.kudos(userId, filter, null)).then(
      (data): SectionResult<KudoPage> => ({ data }),
      (): SectionResult<KudoPage> => ({ error: true }),
    ),
  ]);
  if ("failure" in profile) {
    if (isApiError(profile.failure) && profile.failure.status === 404) notFound();
    if (isApiError(profile.failure) && profile.failure.status === 401) redirect(`/login?next=${encodeURIComponent(returnPath)}`);
    return { error: true };
  }
  return { profile: profile.data, firstPage };
}
