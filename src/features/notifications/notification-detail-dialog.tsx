"use client";

import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { CloseIcon } from "@/components/shell/shell-icons";
import { trapTabKey } from "@/features/kudo-compose/dialog-focus-trap";
import { useLocale } from "@/i18n/locale-provider";
import { buildNotificationMessage } from "./build-notification-message";
import { ExternalArrowIcon, NotificationKindIcon } from "./notification-icons";
import { formatNotificationDateTime } from "./notification-time";
import type { NotificationItem } from "./notifications-api";

const ACTION_CLASS =
  "flex h-14 items-center justify-center rounded-control bg-primary px-6 text-lg font-bold text-on-primary hover:bg-primary-hover";

/**
 * F009 SCR-notification-detail "View thông báo": a window over the panel with
 * the full message (FR-206), its absolute time, the inline Community
 * Standards link of a spam warning and one action button to the target
 * (FR-103) — or the unavailable message when the kudo can no longer be opened
 * (E08). It opens even when marking read failed: the failure shows under the
 * text and is announced (R19, FR-405). Esc, the backdrop and Đóng close it;
 * focus stays inside and returns to the row (spec § 9).
 */
export function NotificationDetailDialog({
  item,
  readFailed,
  onClose,
  onNavigate,
}: {
  item: NotificationItem;
  readFailed: boolean;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const { locale, t } = useLocale();
  const dialog = useRef<HTMLDivElement>(null);
  const message = buildNotificationMessage(item, t);
  const { target } = message;

  useEffect(() => {
    dialog.current?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    trapTabKey(event, dialog.current);
  }

  const actionHref = target.type === "kudo" ? (target.available ? target.href : null) : target.type === "profile" ? target.href : null;

  return (
    <div
      data-notification-layer
      data-testid="notification-detail-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-detail-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-testid="notification-detail"
        className="flex w-[560px] flex-col gap-6 rounded-2xl border border-primary-border bg-menu p-8 outline-none"
      >
        <div className="flex items-center gap-4">
          <NotificationKindIcon icon={message.icon} />
          <h2 id="notification-detail-title" className="flex-1 text-2xl font-bold leading-8 text-white">
            {message.title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="flex size-10 items-center justify-center rounded-control text-white hover:bg-primary-soft">
            <CloseIcon size={24} />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-base font-bold leading-6 text-white">
          <p data-testid="notification-detail-message">
            {[...message.lines, ...message.detailLines].map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          {message.standardsLink && (
            <Link href={message.standardsLink.href} onClick={onNavigate} className="inline-flex w-fit items-center gap-2 underline underline-offset-4 hover:text-primary">
              {message.standardsLink.label}
              <ExternalArrowIcon size={16} />
            </Link>
          )}
          <p className="text-sm text-notice-time">
            {t("notifications.detail.time")}:{" "}
            <time dateTime={item.createdAt} data-testid="notification-detail-time">
              {formatNotificationDateTime(item.createdAt, locale)}
            </time>
          </p>
          <p role="status" data-testid="notification-detail-status" className="text-sm text-compose-link">
            {readFailed ? t("notifications.markReadFailed") : ""}
          </p>
        </div>

        {(target.type === "kudo" || target.type === "profile") && (
          <div className="flex justify-end">
            {actionHref ? (
              <Link href={actionHref} onClick={onNavigate} className={ACTION_CLASS}>
                {message.actionLabel}
              </Link>
            ) : (
              <p data-testid="notification-detail-unavailable" className="text-base font-bold text-notice-time">
                {t("notifications.detail.unavailable")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
