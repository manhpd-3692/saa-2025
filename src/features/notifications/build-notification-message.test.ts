import { describe, expect, it } from "vitest";
import en from "@/i18n/dictionaries/en/notifications.json";
import vi from "@/i18n/dictionaries/vi/notifications.json";
import { translate, withMasterFallback, type Dictionary } from "@/i18n/load-dictionary";
import { buildNotificationMessage, type NotificationMessage } from "./build-notification-message";
import { NOTIFICATION_KINDS, type NotificationItem, type NotificationKind } from "./notifications-api";

const KUDO = "0b9e8d36-2c1a-4bd7-9f61-6c3f0e1c2a11";
const LOCALES: Record<"vi" | "en", Dictionary> = { vi, en: withMasterFallback(vi, en) };
const tFor = (locale: "vi" | "en") => (key: string) => translate(LOCALES[locale], key);

function item(kind: NotificationKind, params: Record<string, unknown> = {}, extra: Partial<NotificationItem> = {}): NotificationItem {
  return { id: "n1", kind, params, kudoId: KUDO, kudoAvailable: true, readAt: null, createdAt: "2026-11-28T10:00:00Z", ...extra };
}

/** Params each producer stores (P2 Create, F005, F008, F011). */
const SAMPLE_PARAMS: Record<NotificationKind, Record<string, unknown>> = {
  kudo_received: { senderId: "s1", senderName: "Huỳnh Dương Xuân Nhật", senderAvatarUrl: null },
  heart_received: { receiverName: "Trần Thị Bình" },
  secret_box_received: {},
  hero_level_up: { levelKey: "Rising", fromLevelKey: "New", sendersCount: 5 },
  kudo_spam_warning: {},
  icons_completed: {},
  generic: { message: "Lời nhắn từ nhóm bạn đã đến!" },
};

const allText = (m: NotificationMessage) => [m.title, ...m.lines, ...m.detailLines, m.standardsLink?.label ?? "", m.actionLabel ?? ""].join("\n");

describe("buildNotificationMessage: the seven kinds in both languages (FR-002, FR-004)", () => {
  for (const locale of ["vi", "en"] as const) {
    it.each(NOTIFICATION_KINDS)(`${locale}: %s renders complete text with no key or placeholder left`, (kind) => {
      const message = buildNotificationMessage(item(kind, SAMPLE_PARAMS[kind]), tFor(locale));
      expect(message.lines.length).toBeGreaterThan(0);
      expect(message.title).not.toBe("");
      expect(allText(message)).not.toMatch(/notifications\.|\{\w+\}|undefined|null/);
    });
  }

  it("each kind keeps its own icon (FR-202) and the Figma wording in Vietnamese", () => {
    const t = tFor("vi");
    const icons = NOTIFICATION_KINDS.map((kind) => buildNotificationMessage(item(kind, SAMPLE_PARAMS[kind]), t).icon);
    expect(icons).toEqual(["mail", "heart", "gift", "star", "warning", "badge", "mail"]);
    expect(buildNotificationMessage(item("kudo_received", SAMPLE_PARAMS.kudo_received), t).lines).toEqual([
      "Sunner Huỳnh Dương Xuân Nhật vừa gửi đến bạn lời ghi nhận đầy yêu thương!",
    ]);
    expect(buildNotificationMessage(item("heart_received", SAMPLE_PARAMS.heart_received), t).lines).toEqual([
      "Wow! Lời nhắn gửi của bạn cho Sunner Trần Thị Bình vừa nhận thêm lượt tim!",
    ]);
    expect(buildNotificationMessage(item("secret_box_received"), t).lines).toEqual([
      "Chúc mừng! Bạn vừa nhận được lượt mở Secret Box mới! Click vào đây để mở ngay nhé!",
    ]);
  });
});

describe("hero_level_up (Codex N04, SC-014 render part)", () => {
  const notice = item("hero_level_up", SAMPLE_PARAMS.hero_level_up, { kudoId: null, kudoAvailable: false });

  it("names the reached level and the distinct senders count, with the previous level in the detail (vi)", () => {
    const message = buildNotificationMessage(notice, tFor("vi"));
    expect(message.lines).toEqual([
      "Bạn nhận được 5 lời nhắn gửi từ đồng nghiệp và thăng hạng Rising Hero!",
      "Tiếp tục lan tỏa năng lượng tích cực đến đồng nghiệp nhé!",
    ]);
    expect(message.detailLines).toEqual(["Từ New Hero lên Rising Hero."]);
    expect(message.target).toEqual({ type: "profile", href: "/profile" });
  });

  it("renders the same values in English", () => {
    const message = buildNotificationMessage(notice, tFor("en"));
    expect(message.lines[0]).toBe("You have received kudos from 5 colleagues and reached Rising Hero!");
    expect(message.detailLines).toEqual(["From New Hero to Rising Hero."]);
    expect(message.actionLabel).toBe("View profile");
  });

  it("has no transition line without a previous level, and shows an unknown level key as is", () => {
    const first = buildNotificationMessage(item("hero_level_up", { levelKey: "New", fromLevelKey: null, sendersCount: 1 }), tFor("vi"));
    expect(first.detailLines).toEqual([]);
    expect(first.lines[0]).toContain("New Hero");
    const unknown = buildNotificationMessage(item("hero_level_up", { levelKey: "Mythic", fromLevelKey: "Legend", sendersCount: 40 }), tFor("en"));
    expect(unknown.lines[0]).toContain("reached Mythic!");
  });
});

describe("anonymity and targets (BR-002, BR-007, FR-103, FR-206)", () => {
  it("a kudo notice without sender fields names nobody, in both languages", () => {
    for (const locale of ["vi", "en"] as const) {
      const message = buildNotificationMessage(item("kudo_received", {}), tFor(locale));
      expect(allText(message)).not.toContain("Huỳnh");
      expect(message.lines[0]).toMatch(/ẩn danh|anonymous/);
    }
  });

  it("kudo notices open the kudo detail; an unavailable kudo says so", () => {
    const t = tFor("vi");
    expect(buildNotificationMessage(item("heart_received", SAMPLE_PARAMS.heart_received), t).target).toEqual({
      type: "kudo",
      href: `/kudos/${KUDO}`,
      available: true,
    });
    const gone = buildNotificationMessage(item("kudo_received", {}, { kudoAvailable: false }), t);
    expect(gone.target).toEqual({ type: "kudo", href: `/kudos/${KUDO}`, available: false });
    const removed = buildNotificationMessage(item("kudo_received", {}, { kudoId: null, kudoAvailable: false }), t);
    expect(removed.target).toEqual({ type: "kudo", href: null, available: false });
  });

  it("the spam warning links Community Standards inline and its action opens the flagged kudo (X06)", () => {
    const vnMessage = buildNotificationMessage(item("kudo_spam_warning"), tFor("vi"));
    expect(vnMessage.standardsLink).toEqual({ label: "Tiêu chuẩn cộng đồng", href: "/community-standards" });
    expect(vnMessage.target).toEqual({ type: "kudo", href: `/kudos/${KUDO}`, available: true });
    expect(vnMessage.actionLabel).toBe("Xem lời nhắn");
    expect(buildNotificationMessage(item("kudo_spam_warning"), tFor("en")).standardsLink?.label).toBe("Community Standards");
    expect(buildNotificationMessage(item("heart_received"), tFor("vi")).standardsLink).toBeNull();
  });

  it("the Secret Box notice goes to the Secret Box flow; icons go to the own profile; generic has no target", () => {
    const t = tFor("vi");
    expect(buildNotificationMessage(item("secret_box_received"), t).target).toEqual({ type: "secretBox" });
    expect(buildNotificationMessage(item("icons_completed"), t).target).toEqual({ type: "profile", href: "/profile" });
    const generic = buildNotificationMessage(item("generic", SAMPLE_PARAMS.generic), t);
    expect(generic.target).toEqual({ type: "none" });
    expect(generic.actionLabel).toBeNull();
  });

  it("a generic message stays as written in either language; a missing one falls back", () => {
    expect(buildNotificationMessage(item("generic", SAMPLE_PARAMS.generic), tFor("en")).lines).toEqual(["Lời nhắn từ nhóm bạn đã đến!"]);
    expect(buildNotificationMessage(item("generic", { message: "  " }), tFor("en")).lines).toEqual(["You have a new notification."]);
    expect(buildNotificationMessage(item("review_requested" as NotificationKind), tFor("vi")).lines).toEqual(["Bạn có một thông báo mới."]);
  });
});
