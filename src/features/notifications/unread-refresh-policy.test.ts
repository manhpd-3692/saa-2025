import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@/lib/api/api-error";
import { RETURN_REFRESH_MIN_GAP_MS, shouldLogRefreshFailure, shouldRefreshOnReturn } from "./unread-refresh-policy";

describe("shouldRefreshOnReturn: focus and tab-shown reads are throttled (D010, review W3)", () => {
  const last = 1_000_000;

  it("skips a return within the minimum gap of the last read, and reads once the gap has passed", () => {
    expect(shouldRefreshOnReturn(true, last, last + 1)).toBe(false);
    expect(shouldRefreshOnReturn(true, last, last + RETURN_REFRESH_MIN_GAP_MS - 1)).toBe(false);
    expect(shouldRefreshOnReturn(true, last, last + RETURN_REFRESH_MIN_GAP_MS)).toBe(true);
    expect(RETURN_REFRESH_MIN_GAP_MS).toBe(5000);
  });

  it("never reads while the page is hidden, and always reads when nothing was read yet", () => {
    expect(shouldRefreshOnReturn(false, last, last + 60_000)).toBe(false);
    expect(shouldRefreshOnReturn(true, Number.NEGATIVE_INFINITY, 0)).toBe(true);
  });
});

describe("shouldLogRefreshFailure: only real faults reach the console", () => {
  it("stays quiet for a read the bell cancelled or the browser dropped while leaving", () => {
    expect(shouldLogRefreshFailure(new Error("anything"), true)).toBe(false);
    expect(shouldLogRefreshFailure(new DOMException("The operation was aborted.", "AbortError"), false)).toBe(false);
    expect(shouldLogRefreshFailure(new ApiError(0, CLIENT_ERROR_CODES.network, "Go API request failed"), false)).toBe(false);
  });

  it("warns for an answer that came back wrong or too late", () => {
    expect(shouldLogRefreshFailure(new ApiError(500, "internal_error", "Internal server error."), false)).toBe(true);
    expect(shouldLogRefreshFailure(new ApiError(0, CLIENT_ERROR_CODES.timeout, "Go API request timed out"), false)).toBe(true);
    expect(shouldLogRefreshFailure(new ApiError(200, CLIENT_ERROR_CODES.invalidResponse, "bad body"), false)).toBe(true);
  });
});
