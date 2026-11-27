/**
 * Pure routing rules of F002 shared by the Login page, the OAuth callback and
 * `proxy.ts` (A1, A2, A3, A6). No framework imports, so they are unit-tested.
 */

/** The only domain that may sign in (G01, BR-003); Go repeats the check. */
export const COMPANY_EMAIL_DOMAIN = "sun-asterisk.com";

/** Paths answered without a session (F002 A6, F003 D005). */
export const PUBLIC_PATHS = ["/login", "/countdown", "/auth/callback"] as const;

export const LOGIN_PATH = "/login";

/** Reason keys shown on Login (A1); never free text (R22 adds profile_unavailable). */
export const LOGIN_ERROR_REASONS = [
  "cancelled",
  "domain_not_allowed",
  "failed",
  "profile_unavailable",
] as const;
export type LoginErrorReason = (typeof LOGIN_ERROR_REASONS)[number];

/**
 * BR-002: a return path is honoured only when it is an internal path. Control
 * characters are refused too: browsers drop tabs and newlines, which would turn
 * "/\t/evil" into the protocol-relative "//evil".
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.includes("://") || value.includes("\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  return value;
}

/** BR-003 fast path: the email's domain is exactly the company domain. */
export function isCompanyEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  return at > 0 && email.slice(at + 1).toLowerCase() === COMPANY_EMAIL_DOMAIN;
}

/** A known reason key, `failed` for any other value, null without one. */
export function loginErrorReason(value: string | null | undefined): LoginErrorReason | null {
  if (!value) return null;
  return (LOGIN_ERROR_REASONS as readonly string[]).includes(value)
    ? (value as LoginErrorReason)
    : "failed";
}

/** `/login?error=<reason>` for redirects to Login. */
export function loginErrorPath(reason: LoginErrorReason): string {
  return `${LOGIN_PATH}?error=${reason}`;
}

/** A2: the OAuth redirect target, carrying a re-validated return path. */
export function buildCallbackUrl(origin: string, next: string | null | undefined): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

interface RouteRequest {
  pathname: string;
  search: string;
  signedIn: boolean;
  /** `/login` carries an `error` query param (R22: the recovery must not bounce). */
  hasErrorParam: boolean;
}

/**
 * A6 RouteGuard#authorize: routing only, no role check. Returns the redirect
 * target, or null to let the request through.
 */
export function decideRouteAccess(req: RouteRequest): { redirect: string } | null {
  if (req.pathname === LOGIN_PATH) {
    return req.signedIn && !req.hasErrorParam ? { redirect: "/" } : null; // DEC-002
  }
  if (isPublicPath(req.pathname) || req.signedIn) return null;
  const next = safeNext(`${req.pathname}${req.search}`);
  return { redirect: next === "/" ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(next)}` }; // DEC-001
}
