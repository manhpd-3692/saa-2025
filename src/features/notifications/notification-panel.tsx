"use client";

import { useEffect, useRef, type Ref } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { MarkAllReadIcon } from "./notification-icons";
import { NotificationItemRow } from "./notification-item-row";
import type { NotificationItem } from "./notifications-api";
import type { NotificationListState } from "./use-notification-list";

/** Older rows are requested this far before the end of the full history comes into view. */
const SENTINEL_MARGIN = "400px";

export type PanelVariant = "dropdown" | "all";

interface PanelProps {
  variant: PanelVariant;
  list: NotificationListState & { retry: () => void; loadMore: () => void };
  canMarkAll: boolean;
  markingAll: boolean;
  panelRef: Ref<HTMLDivElement>;
  onMarkAll: () => void;
  onViewAll: () => void;
  onOpen: (item: NotificationItem, opener: HTMLElement) => void;
  onNavigate: () => void;
}

const TEXT_BUTTON =
  "flex h-10 items-center gap-2 rounded-control px-2 text-base font-bold leading-6 text-white hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50";

/**
 * F009 SCR-notification-panel "Thông báo". `dropdown` is the panel under the
 * bell (Figma 589:9152: "Xem tất cả" and an icon to mark all read); `all` is
 * the full history in the same panel (Figma 589:9132, D001), where older pages
 * load as the Sunner scrolls. States: loading, empty, error + retry (FR-204);
 * a failed older page keeps the rows and offers retry at the end (US005).
 */
export function NotificationPanel({ variant, list, canMarkAll, markingAll, panelRef, onMarkAll, onViewAll, onOpen, onNavigate }: PanelProps) {
  const { t } = useLocale();
  const { items, status, nextCursor, more, loadMore } = list;
  const sentinel = useRef<HTMLDivElement>(null);
  const all = variant === "all";

  useEffect(() => {
    const node = sentinel.current;
    if (!all || !node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { rootMargin: SENTINEL_MARGIN });
    observer.observe(node);
    return () => observer.disconnect();
  }, [all, loadMore, items.length, more]);

  const markAllLabel = t("notifications.panel.markAll");
  const markAllDisabled = !canMarkAll || markingAll || items.length === 0;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="notification-panel-title"
      aria-busy={status === "loading" || markingAll}
      tabIndex={-1}
      data-testid={all ? "notification-panel-all" : "notification-panel"}
      className={`flex flex-col rounded-2xl bg-menu outline-none ${all ? "w-[680px] pb-2" : "max-h-[calc(100vh-104px)] w-[528px]"}`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between pl-4 pr-6">
        <h2 id="notification-panel-title" className="text-2xl font-bold leading-8 text-white">
          {t("notifications.panel.title")}
        </h2>
        <div className="flex items-center gap-4">
          {!all && nextCursor !== null && (
            <button type="button" onClick={onViewAll} className={TEXT_BUTTON}>
              {t("notifications.panel.viewAll")}
            </button>
          )}
          <button
            type="button"
            onClick={onMarkAll}
            disabled={markAllDisabled}
            aria-label={all ? undefined : markAllLabel}
            title={all ? undefined : markAllLabel}
            className={all ? TEXT_BUTTON : `${TEXT_BUTTON} w-10 justify-center px-0`}
          >
            <MarkAllReadIcon size={24} />
            {all && markAllLabel}
          </button>
        </div>
      </div>

      <div className={all ? "" : "min-h-0 overflow-y-auto overscroll-contain"}>
        {items.length === 0 ? (
          <PanelState status={status} onRetry={list.retry} />
        ) : (
          <ul aria-label={t("notifications.panel.title")} className="px-4">
            {items.map((item) => (
              <NotificationItemRow key={item.id} item={item} now={list.loadedAt} onOpen={onOpen} onNavigate={onNavigate} />
            ))}
          </ul>
        )}
        {all && items.length > 0 && nextCursor !== null && (
          more === "error" ? (
            <div role="alert" className="flex items-center justify-center gap-4 py-4 text-base font-bold text-white">
              {t("notifications.panel.moreError")}
              <button type="button" onClick={loadMore} className="h-10 rounded-panel bg-primary px-4 text-on-primary hover:bg-primary-hover">
                {t("common.retry")}
              </button>
            </div>
          ) : (
            <div ref={sentinel} role="status" data-testid="notification-sentinel" className="flex h-12 items-center justify-center text-base font-bold text-notice-time">
              {more === "loading" ? t("notifications.panel.loadingMore") : ""}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** Loading skeleton, error with retry, or the empty message (FR-204, DEC-003). */
function PanelState({ status, onRetry }: { status: NotificationListState["status"]; onRetry: () => void }) {
  const { t } = useLocale();
  if (status === "loading") {
    return (
      <ul aria-label={t("common.loading")} data-testid="notification-skeleton" className="px-4">
        {[0, 1, 2].map((n) => (
          <li key={n} className="flex animate-pulse gap-6 border-b border-divider px-4 py-4">
            <span className="size-10 shrink-0 rounded-panel bg-primary-soft" />
            <span className="flex flex-1 flex-col gap-2 py-1">
              <span className="h-4 w-11/12 rounded bg-primary-soft" />
              <span className="h-4 w-2/3 rounded bg-primary-soft" />
              <span className="h-3 w-1/4 rounded bg-primary-soft" />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 px-4 py-10 text-base font-bold text-white">
        {t("notifications.panel.loadError")}
        <button type="button" onClick={onRetry} className="h-10 rounded-panel bg-primary px-4 text-on-primary hover:bg-primary-hover">
          {t("common.retry")}
        </button>
      </div>
    );
  }
  return (
    <p data-testid="notification-empty" className="px-4 py-10 text-center text-base font-bold text-notice-time">
      {t("notifications.panel.empty")}
    </p>
  );
}
