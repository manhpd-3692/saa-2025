"use client";

import { PencilIcon } from "@/components/shell/shell-icons";
import { useShellActions } from "@/components/shell/shell-actions-context";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { useLocale } from "@/i18n/locale-provider";
import type { ProfileData } from "./profile-api";

/**
 * "Gửi lời cảm ơn và ghi nhận tới <name>" on a teammate's profile (Figma
 * 362:5097): opens F005's write window with this Sunner preselected as the
 * recipient, still changeable (shell action `compose` with `receiver`).
 */
export function ProfileSendKudoButton({ user }: { user: ProfileData["user"] }) {
  const { t } = useLocale();
  const shell = useShellActions();
  return (
    <button
      type="button"
      data-testid="profile-send-kudo"
      onClick={() =>
        shell?.runAction("compose", { receiver: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, unitCode: user.unitCode } })
      }
      className="flex h-[72px] w-full items-center justify-center gap-4 rounded-full border border-primary-border bg-primary-soft px-6 text-base font-bold text-white hover:bg-primary-muted"
    >
      <PencilIcon size={24} className="shrink-0" />
      <span className="truncate">{fillText(t("profile.send"), { name: user.name })}</span>
    </button>
  );
}
