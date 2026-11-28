import { NotFoundPage } from "@/components/errors/not-found-page";
import { MinimalChrome } from "@/components/shell/minimal-chrome";

/**
 * F006 FR-405 / SC-006: a missing, non-uuid or not-viewable kudo shows the
 * same 404 as any unknown URL, in the minimal chrome (decision C01). The page
 * marks itself `data-minimal-page`, so the shell around this segment does not
 * render its own header, footer and FAB: the chrome is drawn once.
 */
export default function KudoNotFound() {
  return (
    <div data-minimal-page className="flex flex-1 flex-col">
      <MinimalChrome bodyAs="div">
        <NotFoundPage />
      </MinimalChrome>
    </div>
  );
}
