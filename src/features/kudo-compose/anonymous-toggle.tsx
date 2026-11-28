"use client";

import { useLocale } from "@/i18n/locale-provider";

/**
 * F005 FR-207 (Figma 2099:9148 states): "Gửi lời cám ơn và ghi nhận ẩn danh".
 * Unticked the label is grey; ticked it turns dark and the box fills olive.
 * The sender is still stored; only admins ever see it (BR-005, G04).
 */
export function AnonymousToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const { t } = useLocale();
  return (
    <label className="flex w-fit cursor-pointer items-center gap-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-6 shrink-0 cursor-pointer appearance-none rounded-control border-2 border-primary-border bg-white checked:bg-primary-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-border"
      />
      <span className={`text-[22px] font-bold leading-7 ${checked ? "text-on-primary" : "text-compose-muted"}`}>
        {t("kudo-compose.anonymous.label")}
      </span>
    </label>
  );
}
