import { ErrorStatePage } from "./error-state-page";

/** F001 A8 NotFoundPage (SCR-error-not-found), rendered by the root `app/not-found.tsx`. */
export function NotFoundPage() {
  return (
    <ErrorStatePage
      testId="not-found-page"
      titleKey="errors.notFound.title"
      messageKey="errors.notFound.message"
      artSrc="/images/errors/not-found-art.webp"
    />
  );
}
