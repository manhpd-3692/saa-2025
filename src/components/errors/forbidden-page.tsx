import { ErrorStatePage } from "./error-state-page";

/**
 * F001 A9 ForbiddenPage (SCR-error-forbidden): a plain component, not a route
 * (AD15, Codex R18). `app/admin/layout.tsx` renders it inside `MinimalChrome`
 * when Go says the Sunner is not an admin; its HTTP status is not asserted.
 */
export function ForbiddenPage() {
  return (
    <ErrorStatePage
      testId="forbidden-page"
      titleKey="errors.forbidden.title"
      messageKey="errors.forbidden.message"
      artSrc="/images/errors/forbidden-art.webp"
    />
  );
}
