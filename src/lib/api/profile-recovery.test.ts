import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error";
import {
  PROFILE_UNAVAILABLE_LOGIN_PATH,
  ProfileRecoveryError,
  withProfileRecovery,
} from "./profile-recovery";

const notProvisioned = () =>
  new ApiError(403, "profile_not_provisioned", "no profile");

describe("withProfileRecovery (F002 R22)", () => {
  it("returns the first answer without provisioning when it succeeds", async () => {
    const provision = vi.fn();
    await expect(withProfileRecovery(async () => "ok", provision)).resolves.toBe("ok");
    expect(provision).not.toHaveBeenCalled();
  });

  it("provisions once and retries once on 403 profile_not_provisioned", async () => {
    const call = vi.fn().mockRejectedValueOnce(notProvisioned()).mockResolvedValueOnce("me");
    const provision = vi.fn().mockResolvedValue(undefined);
    await expect(withProfileRecovery(call, provision)).resolves.toBe("me");
    expect(provision).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("fails the recovery when provisioning fails, without retrying", async () => {
    const call = vi.fn().mockRejectedValue(notProvisioned());
    const provision = vi.fn().mockRejectedValue(new ApiError(0, "timeout", "timed out"));
    await expect(withProfileRecovery(call, provision)).rejects.toBeInstanceOf(ProfileRecoveryError);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("fails the recovery when the retry is still not provisioned (no loop)", async () => {
    const call = vi.fn().mockRejectedValue(notProvisioned());
    const provision = vi.fn().mockResolvedValue(undefined);
    await expect(withProfileRecovery(call, provision)).rejects.toBeInstanceOf(ProfileRecoveryError);
    expect(provision).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("passes every other error through untouched", async () => {
    const forbidden = new ApiError(403, "forbidden", "admins only");
    const provision = vi.fn();
    await expect(withProfileRecovery(() => Promise.reject(forbidden), provision)).rejects.toBe(forbidden);
    expect(provision).not.toHaveBeenCalled();
  });

  it("ends on the Login error that proxy.ts keeps on screen", () => {
    expect(PROFILE_UNAVAILABLE_LOGIN_PATH).toBe("/login?error=profile_unavailable");
  });
});
