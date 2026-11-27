import Image from "next/image";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import { loginErrorReason, safeNext } from "@/features/auth/auth-routing";
import { GoogleSignInButton } from "@/features/auth/google-sign-in-button";
import { LoginErrorMessage } from "@/features/auth/login-error-message";

// The reason key and return path are URL data read at request time, so the page
// blocks on navigation like the root layout (Login is a full-page entry point).
export const instant = false;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * F002 A1 Login (Figma 662:14387) inside the minimal chrome: key visual,
 * "ROOT FURTHER", two lines of copy, the Google button and, after a failed
 * attempt, the message for its reason key. `error` is one of a fixed set of
 * reason keys, never free text; `next` is re-validated before it reaches the
 * OAuth redirect (BR-002).
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const reason = loginErrorReason(firstValue(params.error));
  const next = safeNext(firstValue(params.next));
  const { t } = await getRequestTranslator("auth");

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url(/images/login/key-visual.webp)] bg-cover bg-center"
      />
      <section className="relative px-36 pb-16 pt-[207px]">
        <h1>
          <Image src="/images/login/root-further.png" alt={t("auth.login.keyVisual")} width={454} height={203} priority />
        </h1>
        <div className="mt-20 pl-4">
          <p className="text-xl font-bold leading-10 tracking-[0.5px]">
            <span className="block">{t("auth.login.intro")}</span>
            <span className="block">{t("auth.login.cta")}</span>
          </p>
          <div className="mt-[23px]">
            <GoogleSignInButton next={next} label={t("auth.login.button")} />
          </div>
          {reason && <LoginErrorMessage reason={reason} />}
        </div>
      </section>
    </>
  );
}
