import { describe, expect, it, vi } from "vitest";
import { classifyAdminCallFailure, loginHref } from "./admin-call-failure";
import { downloadExport, filenameFromContentDisposition, runExport } from "./export-download";
import { ApiError } from "@/lib/api/api-error";

const encoder = new TextEncoder();
const BOM = String.fromCharCode(0xfeff);

/** A 200 CSV response whose body either completes or is cut off after the first chunk. */
function csvResponse(complete: boolean, headers: Record<string, string> = {}): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(BOM + "ID,User\r\nabc,Bình\r\n"));
      if (complete) controller.close();
      else controller.error(new TypeError("network error")); // Go aborted the connection (N11)
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", ...headers } });
}

function run(response: Response | Error) {
  const save = vi.fn<(blob: Blob, filename: string) => void>();
  const fetchImpl = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  const outcome = downloadExport({
    url: "http://api.test/api/v1/admin/users/export",
    token: "token-1",
    fallbackName: "saa-export.csv",
    save,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { outcome, save, fetchImpl };
}

describe("downloadExport (Codex N11, R06)", () => {
  it("saves the complete body once, under the server's file name, with the bearer token", async () => {
    const { outcome, save, fetchImpl } = run(csvResponse(true, { "Content-Disposition": "attachment; filename=saa-users-2026-11-28.csv" }));
    await expect(outcome).resolves.toEqual({ kind: "saved", filename: "saa-users-2026-11-28.csv" });
    expect(save).toHaveBeenCalledOnce();
    const [blob, filename] = save.mock.calls[0];
    expect(filename).toBe("saa-users-2026-11-28.csv");
    // The bytes as Go sent them, BOM included (Blob.text() would drop it).
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(await blob.arrayBuffer())).toBe(BOM + "ID,User\r\nabc,Bình\r\n");
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toEqual({ Authorization: "Bearer token-1" });
  });

  it("saves nothing and reports a failure when the body is cut off after rows arrived", async () => {
    const { outcome, save } = run(csvResponse(false, { "Content-Disposition": "attachment; filename=x.csv" }));
    await expect(outcome).resolves.toEqual({ kind: "failed" });
    expect(save).not.toHaveBeenCalled();
  });

  it("saves nothing on a server error, a network failure, 401 or 403", async () => {
    const serverError = run(new Response('{"error":{"code":"internal_error"}}', { status: 500 }));
    const network = run(new TypeError("Failed to fetch"));
    const signedOut = run(new Response(null, { status: 401 }));
    const forbidden = run(new Response(null, { status: 403 }));
    await expect(serverError.outcome).resolves.toEqual({ kind: "failed" });
    await expect(network.outcome).resolves.toEqual({ kind: "failed" });
    await expect(signedOut.outcome).resolves.toEqual({ kind: "unauthorized" });
    await expect(forbidden.outcome).resolves.toEqual({ kind: "forbidden" });
    for (const { save } of [serverError, network, signedOut, forbidden]) expect(save).not.toHaveBeenCalled();
  });

  it("falls back to the given name without a readable Content-Disposition", async () => {
    const { outcome } = run(csvResponse(true));
    await expect(outcome).resolves.toEqual({ kind: "saved", filename: "saa-export.csv" });
  });
});

describe("runExport (review W1: the Export button always leaves busy)", () => {
  const base = { path: "/api/v1/admin/overview/export?from=2026-11-01&to=2026-11-08", fallbackName: "x.csv" };

  it("resolves a failed export, without any request, when the API base is not configured", async () => {
    const fetchImpl = vi.fn();
    const save = vi.fn();
    await expect(runExport({ ...base, apiBase: undefined, getToken: async () => "t", save, fetchImpl: fetchImpl as unknown as typeof fetch }))
      .resolves.toEqual({ kind: "failed" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("resolves a failed export when saving the file throws", async () => {
    const save = vi.fn(() => {
      throw new Error("download blocked");
    });
    const fetchImpl = vi.fn(async () => csvResponse(true));
    await expect(runExport({ ...base, apiBase: "http://api.test/", getToken: async () => "t", save, fetchImpl: fetchImpl as unknown as typeof fetch }))
      .resolves.toEqual({ kind: "failed" });
  });

  it("joins the base and the path, and downloads without a token when the session read fails", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 401 }));
    const outcome = await runExport({
      ...base,
      apiBase: "http://api.test/",
      getToken: async () => {
        throw new Error("storage unavailable");
      },
      save: vi.fn(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome).toEqual({ kind: "unauthorized" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://api.test${base.path}`);
    expect(init.headers).toEqual({});
  });
});

describe("classifyAdminCallFailure (review W2, P3 review W3)", () => {
  it("sends 401 to Login, 403 to the Forbidden page and anything else to the caller's error state", () => {
    expect(classifyAdminCallFailure(new ApiError(401, "unauthorized", "x"))).toBe("sign-in");
    expect(classifyAdminCallFailure(new ApiError(403, "forbidden", "x"))).toBe("forbidden");
    expect(classifyAdminCallFailure(new ApiError(500, "internal_error", "x"))).toBe("error");
    expect(classifyAdminCallFailure(new ApiError(0, "timeout", "x"))).toBe("error");
    expect(classifyAdminCallFailure(new Error("boom"))).toBe("error");
    expect(loginHref("/admin/users?q=a b&page=2")).toBe("/login?next=%2Fadmin%2Fusers%3Fq%3Da%20b%26page%3D2");
  });
});

describe("filenameFromContentDisposition", () => {
  it.each([
    ["attachment; filename=saa-overview-2026-10-30_2026-11-28.csv", "saa-overview-2026-10-30_2026-11-28.csv"],
    ['attachment; filename="report 1.csv"', "report 1.csv"],
    ['attachment; filename="a.csv"; filename*=UTF-8\'\'b%C3%ACnh.csv', "bình.csv"],
    ["attachment", "fallback.csv"],
    [null, "fallback.csv"],
  ])("%s → %s", (header, expected) => {
    expect(filenameFromContentDisposition(header, "fallback.csv")).toBe(expected);
  });
});
