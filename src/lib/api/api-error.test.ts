import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES, parseApiError } from "./api-error";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status });

describe("parseApiError", () => {
  it("reads status, code and message from the Go envelope", async () => {
    const error = await parseApiError(
      json({ error: { code: "forbidden", message: "Admins only" } }, 403),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 403,
      code: "forbidden",
      message: "Admins only",
    });
    expect(error.isProfileNotProvisioned).toBe(false);
  });

  it("flags 403 profile_not_provisioned", async () => {
    const error = await parseApiError(
      json({ error: { code: "profile_not_provisioned", message: "x" } }, 403),
    );
    expect(error.isProfileNotProvisioned).toBe(true);
  });

  it("does not flag the same code on another status", async () => {
    const error = await parseApiError(
      json({ error: { code: "profile_not_provisioned", message: "x" } }, 401),
    );
    expect(error.isProfileNotProvisioned).toBe(false);
  });

  it("tolerates a bare string error code", async () => {
    const error = await parseApiError(json({ error: "kudo_not_found" }, 404));
    expect(error).toMatchObject({ status: 404, code: "kudo_not_found" });
  });

  it("uses the code as message when the envelope has none", async () => {
    const error = await parseApiError(
      json({ error: { code: "stale_decision" } }, 409),
    );
    expect(error.message).toBe("stale_decision");
  });

  it("uses unknown_error for a non-JSON or unexpected body", async () => {
    const html = await parseApiError(
      new Response("<html>Bad Gateway</html>", { status: 502 }),
    );
    expect(html).toMatchObject({ status: 502, code: CLIENT_ERROR_CODES.unknown });
    expect((await parseApiError(json({ error: 42 }, 500))).code).toBe(
      CLIENT_ERROR_CODES.unknown,
    );
    expect((await parseApiError(json([1], 500))).code).toBe(
      CLIENT_ERROR_CODES.unknown,
    );
  });

  it("keeps the parsed body for callers that need extra fields", async () => {
    const body = {
      error: { code: "stale_decision", message: "m" },
      current: { id: 1 },
    };
    expect((await parseApiError(json(body, 409))).body).toEqual(body);
  });
});
