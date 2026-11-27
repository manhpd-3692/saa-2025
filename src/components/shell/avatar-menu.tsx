"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signOutToLogin } from "@/features/auth/sign-out-action";
import { useLocale } from "@/i18n/locale-provider";
import { useSessionUser } from "./me-refresher";
import { ChevronRightIcon, DashboardIcon, UserIcon } from "./shell-icons";
import { useDismissablePopover } from "./use-dismissable-popover";

const ITEM_CLASS =
  "flex h-14 w-full items-center gap-2 whitespace-nowrap rounded-control px-4 text-base font-bold text-white hover:bg-primary-soft hover:text-glow focus-visible:bg-primary-soft";

/**
 * F001 A3 AvatarMenu (Figma 721:5223 / 721:5277): Profile, Admin (admins
 * only, DEC-001) and Logout. The Admin item is a convenience, not a gate
 * (BR-002): `app/admin/layout.tsx` and Go `RequireAdmin` decide access.
 * Hidden without a signed-in Sunner (FR-602).
 */
export function AvatarMenu() {
  const user = useSessionUser();
  const { t } = useLocale();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>({ menu: true });
  const [signingOut, setSigningOut] = useState(false);
  const [brokenAvatar, setBrokenAvatar] = useState<string | null>(null);

  if (!user) return null;
  const showPhoto = user.avatarUrl !== null && user.avatarUrl !== brokenAvatar;

  async function logout() {
    setSigningOut(true);
    await signOutToLogin();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("shell.account.menu")}: ${user.displayName}`}
        onClick={() => setOpen(!open)}
        className="flex size-10 items-center justify-center overflow-hidden rounded-control border border-primary-border text-white hover:bg-primary-soft"
      >
        {showPhoto ? (
          <Image
            src={user.avatarUrl!}
            alt=""
            width={40}
            height={40}
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setBrokenAvatar(user.avatarUrl)}
            className="size-full object-cover"
          />
        ) : (
          <UserIcon size={20} />
        )}
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={t("shell.account.menu")}
          className="absolute right-0 top-full z-50 mt-2 min-w-[133px] rounded-panel border border-primary-border bg-menu p-1.5"
        >
          <li role="none">
            <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={ITEM_CLASS}>
              {t("shell.account.profile")}
              <UserIcon size={24} />
            </Link>
          </li>
          {user.role === "admin" && (
            <li role="none">
              <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className={ITEM_CLASS}>
                {t("shell.account.admin")}
                <DashboardIcon size={24} />
              </Link>
            </li>
          )}
          <li role="none">
            <button type="button" role="menuitem" onClick={logout} disabled={signingOut} aria-busy={signingOut} className={ITEM_CLASS}>
              {t("shell.account.logout")}
              <ChevronRightIcon size={24} />
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
