"use client";

import Link from "next/link";
import { useDismissablePopover } from "@/components/shell/use-dismissable-popover";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { useLocale } from "@/i18n/locale-provider";
import { MoreCircleIcon } from "./admin-icons";

/**
 * Row Actions "⋯" (FR-205, D008): one item, View profile, which opens the
 * Sunner's profile (F007). No role or account action: admins are seeded by
 * email, never granted here (FR-206).
 */
export function UserRowMenu({ userId, name }: { userId: string; name: string }) {
  const { t } = useLocale();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>({ menu: true });
  return (
    <div ref={ref} className="relative flex justify-center">
      <button
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={fillText(t("admin.users.actions.open"), { name })}
        onClick={() => setOpen(!open)}
        className="rounded-full text-white hover:text-primary"
      >
        <MoreCircleIcon size={24} />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-30 mt-2 rounded-panel border border-primary-border bg-menu p-1.5">
          <li role="none">
            <Link
              role="menuitem"
              href={`/profile/${userId}`}
              onClick={() => setOpen(false)}
              className="flex h-10 items-center whitespace-nowrap rounded-control px-4 text-sm text-white hover:bg-primary-muted focus-visible:bg-primary-muted"
            >
              {t("admin.users.actions.viewProfile")}
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
