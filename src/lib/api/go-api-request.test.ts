import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error";
import { requestGoApi } from "./go-api-request";

const base = {
  baseUrl: "https://api.test/",
  baseUrlEnvName: "API_BASE_URL",
};

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("requestGoApi", () => {
  it("sends a Bearer token to the joined URL and returns parsed JSON", async () => {
    const fetchMock = stubFetch(async () => Response.json({ id: "u1" }));
    const data = await requestGoApi({ ...base, path: "/api/v1/me", token: "tok" });
    expect(data).toEqual({ id: "u1" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.test/api/v1/me");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
  });

  it("omits Authorization without a token and serialises a JSON body", async () => {
    const fetchMock = stubFetch(async () => new Response(null, { status: 204 }));
    const data = await requestGoApi({
      ...base,
      path: "/api/v1/x",
      init: { method: "POST", body: { a: 1 } },
    });
    expect(data).toBeUndefined();
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init.headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe('{"a":1}');
  });

  it("throws ApiError carrying the Go envelope on non-2xx", async () => {
    stubFetch(async () =>
      Response.json(
        { error: { code: "profile_not_provisioned", message: "no profile" } },
        { status: 403 },
      ),
    );
    const error = await requestGoApi({ ...base, path: "/api/v1/me" }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isProfileNotProvisioned).toBe(true);
  });

  it("maps network failure and timeout to status-0 ApiErrors", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const network = await requestGoApi({ ...base, path: "/api/v1/me" }).catch((e) => e);
    expect(network).toMatchObject({ status: 0, code: "network_error" });

    stubFetch(async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    const timeout = await requestGoApi({ ...base, path: "/api/v1/me" }).catch((e) => e);
    expect(timeout).toMatchObject({ status: 0, code: "timeout" });
  });

  it("rejects an invalid JSON success body as invalid_response", async () => {
    stubFetch(async () => new Response("not json", { status: 200 }));
    const error = await requestGoApi({ ...base, path: "/api/v1/me" }).catch((e) => e);
    expect(error).toMatchObject({ status: 200, code: "invalid_response" });
  });

  it("fails fast on missing base URL or a malformed path", async () => {
    await expect(
      requestGoApi({ baseUrl: undefined, baseUrlEnvName: "API_BASE_URL", path: "/x" }),
    ).rejects.toThrow("API_BASE_URL is not configured");
    await expect(requestGoApi({ ...base, path: "//evil.test" })).rejects.toThrow();
    await expect(requestGoApi({ ...base, path: "api/v1/me" })).rejects.toThrow();
  });
});
