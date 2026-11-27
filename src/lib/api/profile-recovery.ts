import { isApiError } from "./api-error";

/**
 * Missing-profile recovery (F002 FR-403, Codex R22, N06): a valid session
 * whose `users` row is missing provisions once; if that fails the session ends
 * on this Login URL, which `proxy.ts` keeps on screen (DEC-002 exception).
 */
export const PROFILE_UNAVAILABLE_LOGIN_PATH = "/login?error=profile_unavailable";

/** Go A9; IDENTITY-ONLY, so it works without a profile row. */
export const PROVISION_PATH = "/api/v1/me/provision";

/** The recovery failed: the caller must end the session (browser sign-out). */
export class ProfileRecoveryError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("The profile could not be provisioned", options);
    this.name = "ProfileRecoveryError";
  }
}

/**
 * Runs `call`; on 403 `profile_not_provisioned` provisions exactly once and
 * retries exactly once. Rejects with ProfileRecoveryError when provisioning
 * fails or the retry is still not provisioned; any other error passes through.
 * Server layouts render `ProfileRecoveryRedirect` on that error (N06); client
 * calls sign out and go to PROFILE_UNAVAILABLE_LOGIN_PATH.
 */
export async function withProfileRecovery<T>(
  call: () => Promise<T>,
  provision: () => Promise<unknown>,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!isApiError(error) || !error.isProfileNotProvisioned) throw error;
  }
  try {
    await provision();
  } catch (cause) {
    throw new ProfileRecoveryError({ cause });
  }
  try {
    return await call();
  } catch (error) {
    if (isApiError(error) && error.isProfileNotProvisioned) {
      throw new ProfileRecoveryError({ cause: error });
    }
    throw error;
  }
}
