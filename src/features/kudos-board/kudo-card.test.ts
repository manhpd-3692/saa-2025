import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/locale-provider";
import boardDictionary from "@/i18n/dictionaries/vi/kudos-board.json";
import { KudoCard } from "./kudo-card";
import type { KudoCardData } from "./kudo-card-types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

const RECEIVER = { id: "8f6c3c1e-1111-4a8b-9c3d-000000000001", name: "Nguyễn Hoàng Linh", avatarUrl: null, unitCode: "CECV2", heroTier: "Legend" as const };
const SENDER = { id: "8f6c3c1e-2222-4a8b-9c3d-000000000002", name: "Huỳnh Dương Xuân Nhật", avatarUrl: null, unitCode: "CECV3", heroTier: "New" as const };

function card(overrides: Partial<KudoCardData>): KudoCardData {
  return {
    id: "0b9e8d36-2c1a-4bd7-9f61-6c3f0e1c2a11",
    createdAt: "2025-10-30T03:00:00Z",
    title: "IDOL GIỚI TRẺ",
    contentHtml: "<p>Cảm ơn người em bình thường nhưng phi thường :D</p>",
    isAnonymous: false,
    sender: SENDER,
    receiver: RECEIVER,
    hashtags: ["dedicated", "inspiring"],
    images: [],
    heart: { total: 1000, viewerHearted: false, viewerCanHeart: true },
    isOwn: false,
    status: "public",
    ...overrides,
  };
}

// children go in createElement's third argument (react/no-children-prop), so they are optional here.
const Provider = LocaleProvider as ComponentType<{ locale: "vi" | "en"; dictionary: Record<string, string>; children?: ReactNode }>;
const render = (data: KudoCardData) =>
  renderToString(createElement(Provider, { locale: "vi", dictionary: boardDictionary }, createElement(KudoCard, { card: data, variant: "feed" })));

describe("KudoCard (F006 FR-002, FR-003, DEC-002, Codex R01)", () => {
  it("shows a masked sender as 'Ẩn danh' with no profile link, hover card or other trace of the author", () => {
    const html = render(card({ isAnonymous: true, sender: null }));
    expect(html).toContain("Ẩn danh");
    expect(html).toContain("Người gửi ẩn danh");
    expect(html).toContain('data-testid="anonymous-sender"');
    // Only the receiver is linked (avatar and name); nothing names or points to the sender.
    expect(html.match(/href="\/profile\//g)).toHaveLength(2);
    expect(html).toContain(`href="/profile/${RECEIVER.id}"`);
    for (const trace of [SENDER.id, SENDER.name, SENDER.unitCode]) expect(html).not.toContain(trace);
    expect(html.match(/data-testid="sunner-avatar"/g)).toHaveLength(1);
  });

  it("shows a named sender with profile links, unit code, tier slot, time, hashtags and the weighted heart count", () => {
    const html = render(card({}));
    expect(html).toContain(`href="/profile/${SENDER.id}"`);
    expect(html).toContain("CECV3");
    expect(html).toContain('data-tier="Legend"');
    expect(html).toContain("10:00 - 10/30/2025");
    expect(html).toContain("#dedicated");
    expect(html).toContain("1.000");
    expect(html).not.toContain('data-testid="kudo-edit"');
  });

  it("shows an image Go could not sign as visible 'Ảnh không khả dụng.' text in its place (FR-002 edge, INT-001)", () => {
    const html = render(card({ images: [{ url: null }, { url: null }] }));
    expect(html.match(/data-testid="image-unavailable"[^>]*>Ảnh không khả dụng\.</g)).toHaveLength(2);
    expect(html).not.toContain('title="Ảnh không khả dụng."');
  });

  it("offers the edit pencil only on the sender's own public kudo (FR-104)", () => {
    expect(render(card({ isOwn: true }))).toContain('data-testid="kudo-edit"');
    expect(render(card({ isOwn: true, status: "spam" }))).not.toContain('data-testid="kudo-edit"');
  });
});
