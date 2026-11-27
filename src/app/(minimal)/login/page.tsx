import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionary, translate } from "@/i18n/load-dictionary";
import { loginErrorReason, safeNext } from "@/features/auth/auth-routing";
import { GoogleSignInButton } from "@/features/auth/google-sign-in-button";

// The reason key and return path are URL data read at request time, so the page
// may block on navigation, like the root layout (revisit with the Phase 3 visuals).
export const instant = false;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * F002 A1 Login (minimal, unstyled; visuals and per-reason copy arrive in
 * Phase 3). The `error` param is one of a fixed set of reason keys, never free
 * text; `next` is re-validated before it reaches the OAuth redirect (BR-002).
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const reason = loginErrorReason(firstValue(params.error));
  const next = safeNext(firstValue(params.next));
  const dictionary = await loadDictionary(await getRequestLocale(), "common");

  return (
    <main>
      <h1>{translate(dictionary, "app.name")}</h1>
      {reason && (
        <p role="alert" data-error-reason={reason}>
          {translate(dictionary, "error.generic")}
        </p>
      )}
      <GoogleSignInButton next={next} />
    </main>
  );
}
