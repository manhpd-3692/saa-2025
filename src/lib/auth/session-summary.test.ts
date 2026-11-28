import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import { resolveSessionSummary, toSessionUser } from "./session-summary";

const me = {
  id: "u1",
  email: "an.nguyen@sun-asterisk.com",
  name: "Nguyễn Văn An",
  avatarUrl: "https://lh3.googleusercontent.com/a/x",
  role: "user",
  unit: null,
};
const notProvisioned = () => new ApiError(403, "profile_not_provisioned", "no profile");

describe("resolveSessionSummary (F001 SC-006, F002 SC-012)", () => {
  it("makes no Go call without a session cookie and reports signed-out", async () => {
    const fetchMe = vi.fn();
    const provision = vi.fn();
    await expect(resolveSessionSummary({ hasSession: false, fetchMe, provision })).resolves.toEqual({
      kind: "signed-out",
    });
    expect(fetchMe).not.toHaveBeenCalled();
    expect(provision).not.toHaveBeenCalled();
  });

  it("maps a 200 /me body to the signed-in summary", async () => {
    const summary = await resolveSessionSummary({ hasSession: true, fetchMe: async () => me, provision: vi.fn() });
    expect(summary).toEqual({
      kind: "signed-in",
      user: { id: "u1", displayName: "Nguyễn Văn An", avatarUrl: "https://lh3.googleusercontent.com/a/x", role: "user" },
    });
  });

  it("treats a 401 from Go as signed out (no avatar, no bell)", async () => {
    const summary = await resolveSessionSummary({
      hasSession: true,
      fetchMe: () => Promise.reject(new ApiError(401, "unauthorized", "no")),
      provision: vi.fn(),
    });
    expect(summary).toEqual({ kind: "signed-out" });
  });

  it.each([
    ["a timeout (5 s budget)", new ApiError(0, "timeout", "timed out")],
    ["a network failure", new ApiError(0, "network_error", "down")],
    ["a 5xx", new ApiError(500, "internal_error", "boom")],
    ["an unreadable body", new ApiError(200, "invalid_response", "bad json")],
  ])("reports unavailable (links and language only) on %s", async (_label, error) => {
    const summary = await resolveSessionSummary({ hasSession: true, fetchMe: () => Promise.reject(error), provision: vi.fn() });
    expect(summary).toEqual({ kind: "unavailable" });
  });

  it("reports unavailable when the 200 body has no usable role", async () => {
    const summary = await resolveSessionSummary({
      hasSession: true,
      fetchMe: async () => ({ ...me, role: "owner" }),
      provision: vi.fn(),
    });
    expect(summary).toEqual({ kind: "unavailable" });
  });

  it("provisions once on 403 profile_not_provisioned and continues signed in", async () => {
    const fetchMe = vi.fn().mockRejectedValueOnce(notProvisioned()).mockResolvedValueOnce({ ...me, role: "admin" });
    const provision = vi.fn().mockResolvedValue(undefined);
    const summary = await resolveSessionSummary({ hasSession: true, fetchMe, provision });
    expect(summary).toMatchObject({ kind: "signed-in", user: { role: "admin" } });
    expect(provision).toHaveBeenCalledTimes(1);
  });

  it("reports profile-missing when the re-provision fails (Codex R22, N06)", async () => {
    const provision = vi.fn().mockRejectedValue(new ApiError(403, "domain_not_allowed", "no"));
    const summary = await resolveSessionSummary({
      hasSession: true,
      fetchMe: () => Promise.reject(notProvisioned()),
      provision,
    });
    expect(summary).toEqual({ kind: "profile-missing" });
    expect(provision).toHaveBeenCalledTimes(1);
  });
});

describe("toSessionUser", () => {
  it("keeps only id, name, avatar and role, and a null avatar stays null", () => {
    expect(toSessionUser({ ...me, avatarUrl: null })).toEqual({
      id: "u1",
      displayName: "Nguyễn Văn An",
      avatarUrl: null,
      role: "user",
    });
  });

  it.each([null, "text", { ...me, name: 3 }, { ...me, role: undefined }, { ...me, id: undefined }, { ...me, id: "" }])("rejects %j", (body) => {
    expect(toSessionUser(body)).toBeNull();
  });
});
