import { describe, expect, it, vi } from "vitest";

const { getCurrentEventForGate } = vi.hoisted(() => ({ getCurrentEventForGate: vi.fn() }));
vi.mock("./events-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./events-api")>()),
  getCurrentEventForGate,
}));

import { isLaunchGateExempt, launchGateRedirect } from "./launch-gate";

const MS_PER_DAY = 86_400_000;

/** The Go answer the gate reads: only `startAt` and `serverNow` matter here. */
const goAnswer = (startInMs: number) => {
  const now = Date.now();
  return { startAt: new Date(now + startInMs).toISOString(), serverNow: new Date(now).toISOString() };
};

describe("isLaunchGateExempt (F003 D002, FR-103)", () => {
  it.each(["/countdown", "/countdown/", "/login", "/auth/callback", "/_next/static/chunks/app.js", "/_next/data/x.json"])(
    "lets %s through before launch",
    (path) => expect(isLaunchGateExempt(path)).toBe(true),
  );

  // Dotted slugs are pages, not files: public assets never reach the proxy (matcher).
  it.each(["/", "/countdown-x", "/loginx", "/_nextx", "/awards/v1.2", "/kudos/a.b", "/admin/users.json", "/profile/john.doe"])(
    "gates %s (FR-101)",
    (path) => expect(isLaunchGateExempt(path)).toBe(false),
  );
});

describe("launchGateRedirect (F003 A1)", () => {
  it("re-reads a cached 'upcoming' for /countdown, so an early start cannot loop / and /countdown", async () => {
    getCurrentEventForGate.mockResolvedValueOnce(goAnswer(2 * MS_PER_DAY));
    expect(await launchGateRedirect("/")).toBe("/countdown");
    expect(await launchGateRedirect("/awards/v1.2")).toBe("/countdown"); // cached reading, dotted slug gated

    // `start_at` is moved earlier within the 60 s TTL: Go now says the event has started, and
    // the countdown page (fresh read) sends the visitor to `/`, which must now pass.
    getCurrentEventForGate.mockResolvedValueOnce(goAnswer(-1_000));
    expect(await launchGateRedirect("/countdown")).toBeNull();
    expect(await launchGateRedirect("/")).toBeNull();

    expect(await launchGateRedirect("/countdown")).toBeNull(); // started: no further read
    expect(getCurrentEventForGate).toHaveBeenCalledTimes(2);
  });
});
