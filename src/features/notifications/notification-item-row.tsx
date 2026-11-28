"use client";

import Link from "next/link";
import { useId } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { buildNotificationMessage } from "./build-notification-message";
import { ExternalArrowIcon, NotificationKindIcon } from "./notification-icons";
import { formatRelativeTime } from "./notification-time";
import type { NotificationItem } from "./notifications-api";

/**
 * F009 E03–E07 one row (Figma 589:9132): type icon, message, relative time and
 * the unread dot (DEC-001). The message is a button (Enter opens it, FR-102);
 * the whole row is a pointer target too. The spam warning's inline "Tiêu chuẩn
 * cộng đồng" link is a separate control (X06), so it never opens the row.
 */
export function NotificationItemRow({
  item,
  now,
  onOpen,
  onNavigate,
}: {
  item: NotificationItem;
  now: Date;
  onOpen: (item: NotificationItem, opener: HTMLElement) => void;
  onNavigate: () => void;
}) {
  const { locale, t } = useLocale();
  const timeId = useId();
  const message = buildNotificationMessage(item, t);
  const unread = item.readAt === null;

  return (
    <li className="border-b border-divider" data-testid="notification-row" data-kind={item.kind} data-unread={unread} data-id={item.id}>
      <div
        className="flex cursor-pointer gap-6 px-4 py-4 hover:bg-primary-soft"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button")) return; // the link and the button act themselves
          onOpen(item, event.currentTarget.querySelector("button") ?? event.currentTarget);
        }}
      >
        <NotificationKindIcon icon={message.icon} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            aria-describedby={timeId}
            onClick={(event) => onOpen(item, event.currentTarget)}
            className="block w-full text-left text-base font-bold leading-6 text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-border"
          >
            {message.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            {unread && <span className="sr-only">{` (${t("notifications.row.unread")})`}</span>}
          </button>
          {message.standardsLink && (
            <Link
              href={message.standardsLink.href}
              onClick={onNavigate}
              className="mt-3 inline-flex items-center gap-2 text-base font-bold leading-6 text-white underline underline-offset-4 hover:text-primary"
            >
              {message.standardsLink.label}
              <ExternalArrowIcon size={16} />
            </Link>
          )}
          <time
            id={timeId}
            dateTime={item.createdAt}
            className={`block text-xs font-bold leading-4 text-notice-time ${message.standardsLink ? "mt-3" : "mt-1.5"}`}
          >
            {formatRelativeTime(item.createdAt, now, locale, t("notifications.time.justNow"))}
          </time>
        </div>
        <span
          aria-hidden="true"
          data-testid="notification-unread-dot"
          className={`size-2 shrink-0 self-center rounded-full ${unread ? "bg-danger" : "invisible"}`}
        />
      </div>
    </li>
  );
}
