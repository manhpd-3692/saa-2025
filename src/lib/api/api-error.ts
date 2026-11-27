/**
 * Typed failure for calls to the Go API.
 * Go error envelope: `{ "error": { "code": string, "message": string } }`
 * (a bare `{ "error": "code" }` string is tolerated for older handlers).
 */

/** 403 returned when the token is valid but the `users` row is missing (F002, R22). */
export const PROFILE_NOT_PROVISIONED = "profile_not_provisioned";

/** Codes produced client-side when no HTTP response was received or readable. */
export const CLIENT_ERROR_CODES = {
  timeout: "timeout",
  network: "network_error",
  invalidResponse: "invalid_response",
  unknown: "unknown_error",
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Parsed JSON body of the error response, when there was one. */
  readonly body: unknown;

  constructor(status: number, code: string, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }

  get isProfileNotProvisioned(): boolean {
    return this.status === 403 && this.code === PROFILE_NOT_PROVISIONED;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeEnvelope(
  body: unknown,
): { code: string; message: string } | null {
  if (!isRecord(body)) return null;
  const { error } = body;
  if (typeof error === "string" && error) {
    return { code: error, message: error };
  }
  if (isRecord(error) && typeof error.code === "string" && error.code) {
    const message = typeof error.message === "string" ? error.message : "";
    return { code: error.code, message: message || error.code };
  }
  return null;
}

/** Builds an ApiError from a non-2xx response; never throws on a malformed body. */
export async function parseApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const envelope = describeEnvelope(body);
  return new ApiError(
    response.status,
    envelope?.code ?? CLIENT_ERROR_CODES.unknown,
    envelope?.message ?? `Request failed with status ${response.status}`,
    body,
  );
}
