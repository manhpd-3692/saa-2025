"use client";

import Image from "next/image";
import { useLocale } from "@/i18n/locale-provider";
import { useSessionUser } from "./me-refresher";
import { useShellActions, type ShellAction } from "./shell-actions-context";
import { CloseIcon, PencilIcon } from "./shell-icons";
import { useDismissablePopover } from "./use-dismissable-popover";

const ITEM_CLASS =
  "flex h-16 items-center gap-2 rounded-control bg-primary pl-4 text-2xl font-bold text-on-primary hover:bg-primary-hover";
// Figma: "Thể lệ" is 149 px wide (25 px right inset), "Viết KUDOS" 214 px (16 px).
const RULES_PAD = "pr-[25px]";
const COMPOSE_PAD = "pr-4";

function SunMark() {
  return <Image src="/images/brand/sun-mark.png" alt="" width={24} height={22} aria-hidden="true" />;
}

/**
 * F001 A5 floating action button (Figma 313:9137 / 313:9139), SM-001: closed
 * pill → open stack "Thể lệ" (F008 rules panel) and "Viết KUDOS" (F005 form)
 * above a red close button. A click on the toggle, Escape, an outside click or
 * picking an item closes it. Items call openers registered in the shell
 * actions context. Shown on full-chrome pages to a signed-in Sunner only.
 * From 1280 px the stack sits 138 px from the right and 120 px from the
 * bottom (the 1164 px content column edge, as in the 1440 px frames); the closed
 * pill is inset a further 5 px, as in fab-closed.
 */
export function FloatingActionButton() {
  const user = useSessionUser();
  const actions = useShellActions();
  const { t } = useLocale();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>();
  if (!user) return null;

  function pick(action: ShellAction) {
    setOpen(false);
    actions?.runAction(action);
  }

  return (
    <div ref={ref} data-testid="fab" className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-5 xl:bottom-[120px] xl:right-[138px]">
      {open && (
        <ul className="flex flex-col items-end gap-5">
          <li>
            <button type="button" onClick={() => pick("rules")} className={`${ITEM_CLASS} ${RULES_PAD}`}>
              <SunMark />
              {t("shell.fab.rules")}
            </button>
          </li>
          <li>
            <button type="button" onClick={() => pick("compose")} className={`${ITEM_CLASS} ${COMPOSE_PAD}`}>
              <PencilIcon size={24} />
              {t("shell.fab.writeKudos")}
            </button>
          </li>
        </ul>
      )}
      <button
        type="button"
        data-popover-trigger
        aria-expanded={open}
        aria-label={open ? t("shell.fab.close") : t("shell.fab.open")}
        onClick={() => setOpen(!open)}
        className={
          open
            ? "flex size-14 items-center justify-center rounded-full bg-danger text-white"
            : "flex h-16 w-[106px] items-center justify-center gap-1 rounded-full bg-primary text-2xl font-bold text-on-primary shadow-glow hover:bg-primary-hover xl:mr-[5px]"
        }
      >
        {open ? (
          <CloseIcon size={24} />
        ) : (
          <>
            <PencilIcon size={24} />
            <span aria-hidden="true">/</span>
            <SunMark />
          </>
        )}
      </button>
    </div>
  );
}
