"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useSessionUser } from "@/components/shell/me-refresher";
import { BellIcon } from "@/components/shell/shell-icons";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { translate, type Dictionary } from "@/i18n/load-dictionary";
import type { Locale } from "@/i18n/locale-config";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import { useUnreadCount } from "./use-unread-count";

// The panel, detail window and their data code load on the first open.
const NotificationCenter = dynamic(() => import("./notification-center").then((m) => m.NotificationCenter), { ssr: false });

/** How long a bell-level failure message stays on screen. */
const ANNOUNCEMENT_MS = 6000;

type View = "closed" | "dropdown" | "all";

const subscribeNothing = () => () => {};

interface BellProps {
  locale: Locale;
  dictionary: Dictionary;
}

/**
 * F009 bell (F001 A4 slot, FR-101, FR-205). Hidden without a signed-in Sunner
 * (F001 FR-602). All bell state — count, open panel, loaded list — belongs to
 * one user: it is keyed by the user id, so when MeRefresher swaps the Sunner
 * (sign-out and sign-in as someone else, a refresh on focus) everything starts
 * over and an answer meant for the previous user is never shown (review W1).
 */
export function NotificationBell(props: BellProps) {
  const user = useSessionUser();
  return user ? <UserNotificationBell key={user.id} {...props} /> : null;
}

/**
 * A dot while anything is unread (count refreshed on load, focus and every
 * 60 s — FR-404, D010); a click opens the panel under it, "Xem tất cả" the full
 * history (the bell turns gold, Figma 589:9132). Esc, an outside click or the
 * bell close it; Esc returns focus to the bell. The panel texts come from
 * `dictionary` (`common` + `notifications`), the bell's own label from the
 * shell dictionary.
 */
function UserNotificationBell({ locale, dictionary }: BellProps) {
  const { t } = useLocale();
  const { count, refresh, adjust } = useUnreadCount();
  const [view, setView] = useState<View>("closed");
  const [announcement, setAnnouncement] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const open = view !== "closed";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || wrapper.current?.contains(target) || target.closest("[data-notification-layer]")) return;
      setView("closed");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(""), ANNOUNCEMENT_MS);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  const unread = (count ?? 0) > 0;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // The detail window handles its own Esc first and stops it (it closes only itself).
    if (event.key !== "Escape" || !open) return;
    event.stopPropagation();
    setView("closed");
    bell.current?.focus();
  }

  return (
    <div ref={wrapper} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={bell}
        type="button"
        aria-label={t("shell.notifications")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={unread ? "notification-bell-unread" : undefined}
        data-testid="notification-bell"
        data-unread={unread}
        onClick={() => setView(open ? "closed" : "dropdown")}
        className={`relative flex size-10 items-center justify-center rounded-control hover:bg-primary-soft ${view === "all" ? "text-primary" : "text-white"}`}
      >
        <BellIcon size={24} />
        {unread && <span data-testid="notification-bell-dot" className="absolute right-2.5 top-2 size-2 rounded-full bg-danger" />}
      </button>
      {unread && (
        <span id="notification-bell-unread" className="sr-only">
          {fillText(translate(dictionary, "notifications.bell.unread"), { count: count ?? 0 })}
        </span>
      )}
      {open && (
        <LocaleProvider locale={locale} dictionary={dictionary}>
          <NotificationCenter
            view={view}
            unreadCount={count}
            adjustUnread={adjust}
            refreshUnread={refresh}
            onViewAll={() => setView("all")}
            onClose={() => setView("closed")}
            onAnnounce={setAnnouncement}
          />
        </LocaleProvider>
      )}
      {/* Always present once hydrated, so a later message is announced (polite); above any modal. */}
      {isClient &&
        createPortal(
          <div role="status" data-testid="notification-announcement" className="fixed bottom-10 left-1/2 z-[60] -translate-x-1/2">
            {announcement && (
              <p className="rounded-panel border border-primary-border bg-menu px-6 py-3 text-base font-bold text-white shadow-lg">{announcement}</p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
