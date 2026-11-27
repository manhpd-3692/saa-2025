import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/browser-client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) },
  }),
}));

import { BROWSER_API_TIMEOUT_MS, goApiBrowser } from "./go-api-browser";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("goApiBrowser", () => {
  it("bounds every call to 5 s so a hung request cannot block its caller (R23)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test");
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    await goApiBrowser("/api/v1/me");

    expect(BROWSER_API_TIMEOUT_MS).toBe(5000);
    expect(timeoutSpy).toHaveBeenCalledWith(5000);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
