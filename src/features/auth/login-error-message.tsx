import { getRequestTranslator } from "@/i18n/get-request-translator";
import type { LoginErrorReason } from "./auth-routing";

/**
 * F002 A1 E04 sign-in message: one localized sentence per reason key (never
 * the raw URL text). Announced on arrival (role="alert"); the button stays usable.
 */
export async function LoginErrorMessage({ reason }: { reason: LoginErrorReason }) {
  const { t } = await getRequestTranslator("auth");
  return (
    <p
      role="alert"
      data-error-reason={reason}
      className="mt-6 w-fit max-w-[560px] rounded-panel border border-danger/70 bg-danger/20 px-4 py-3 text-base font-semibold leading-6 text-white"
    >
      {t(`auth.error.${reason}`)}
    </p>
  );
}
