"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useShellActions } from "@/components/shell/shell-actions-context";
import { useLocale } from "@/i18n/locale-provider";
import { NotificationDetailDialog } from "./notification-detail-dialog";
import { NotificationPanel, type PanelVariant } from "./notification-panel";
import { markAllNotificationsRead, markNotificationRead, type NotificationItem } from "./notifications-api";
import { useNotificationList } from "./use-notification-list";

export interface NotificationCenterProps {
  view: PanelVariant;
  unreadCount: number | null;
  adjustUnread: (change: (current: number) => number) => void;
  refreshUnread: () => Promise<void>;
  onViewAll: () => void;
  /** Closes the panel (after a link, or when the Secret Box flow takes over). */
  onClose: () => void;
  /** Bell-level live message for a failure once the panel is gone (Secret Box path, read-all). */
  onAnnounce: (message: string) => void;
}

/**
 * F009 A3, A5–A7 behind the bell: one list shared by the dropdown and the full
 * history view (D001), the detail window, mark-one-read and read-all. Opening
 * an item never waits for A6: the detail (or the Secret Box flow, DEC-002)
 * opens at once; on success the dot clears and the bell count drops, on
 * failure the dot and count stay and the failure is announced (FR-405, R19).
 */
export function NotificationCenter({ view, unreadCount, adjustUnread, refreshUnread, onViewAll, onClose, onAnnounce }: NotificationCenterProps) {
  const { t } = useLocale();
  const list = useNotificationList();
  const shell = useShellActions();
  const [detail, setDetail] = useState<{ item: NotificationItem; readFailed: boolean } | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const { markRead: markReadLocally, markAllRead: markAllReadLocally } = list;

  useEffect(() => {
    // Focus moves into the panel on open and on "Xem tất cả" (spec § 9) without scrolling the
    // full history, which is taller than the window, to its own top edge.
    panel.current?.focus({ preventScroll: true });
  }, [view]);

  useEffect(() => {
    void refreshUnread(); // A2 re-check whenever the panel opens
  }, [refreshUnread]);

  useEffect(() => {
    if (view !== "all") return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the full history scrolls, not the page behind
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [view]);

  /** A6 once per unread item; resolves whether the notice is read now. */
  const markRead = useCallback(
    async (item: NotificationItem) => {
      if (item.readAt) return true;
      try {
        await markNotificationRead(item.id);
      } catch (error) {
        console.warn("mark notification read failed", error);
        return false;
      }
      markReadLocally(item.id);
      adjustUnread((n) => n - 1);
      void refreshUnread();
      return true;
    },
    [adjustUnread, markReadLocally, refreshUnread],
  );

  function openItem(item: NotificationItem, from: HTMLElement) {
    if (item.kind === "secret_box_received") {
      onClose();
      shell?.runAction("secretBox");
      void markRead(item).then((ok) => ok || onAnnounce(t("notifications.markReadFailed")));
      return;
    }
    opener.current = from;
    setDetail({ item, readFailed: false });
    void markRead(item).then((ok) => {
      if (!ok) setDetail((d) => (d?.item.id === item.id ? { ...d, readFailed: true } : d));
    });
  }

  function closeDetail() {
    setDetail(null);
    if (opener.current?.isConnected) opener.current.focus();
  }

  async function markAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      markAllReadLocally();
      adjustUnread(() => 0);
      void refreshUnread();
    } catch (error) {
      console.warn("mark all notifications read failed", error);
      onAnnounce(t("notifications.markReadFailed"));
    } finally {
      setMarkingAll(false);
    }
  }

  const content = (
    <NotificationPanel
      variant={view}
      list={list}
      canMarkAll={(unreadCount ?? 0) > 0 || list.items.some((item) => item.readAt === null)}
      markingAll={markingAll}
      panelRef={panel}
      onMarkAll={() => void markAll()}
      onViewAll={onViewAll}
      onOpen={openItem}
      onNavigate={onClose}
    />
  );

  return (
    <>
      {view === "dropdown" ? (
        // Figma 589:9152: the panel's right edge sits 12 px right of the bell, 28 px below it.
        <div className="absolute -right-3 top-full z-50 mt-7">{content}</div>
      ) : (
        createPortal(
          // Below the sticky header (z-40), so the bell and the header stay usable (Figma 589:9132).
          <div
            data-notification-layer
            data-testid="notification-all-backdrop"
            className="fixed inset-0 z-30 overflow-y-auto bg-page/50"
            onClick={(event) => event.target === event.currentTarget && onClose()}
          >
            <div className="mx-auto w-fit pb-16 pt-[192px]">{content}</div>
          </div>,
          document.body,
        )
      )}
      {detail &&
        createPortal(
          <NotificationDetailDialog item={detail.item} readFailed={detail.readFailed} onClose={closeDetail} onNavigate={onClose} />,
          document.body,
        )}
    </>
  );
}
