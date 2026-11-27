import { ApiError, CLIENT_ERROR_CODES, parseApiError } from "./api-error";

export interface GoApiRequestInit {
  method?: string;
  /** Serialised as JSON when defined. */
  body?: unknown;
  headers?: HeadersInit;
  /** Caller cancellation; combined with any timeout. */
  signal?: AbortSignal;
}

interface GoApiRequestOptions {
  baseUrl: string | undefined;
  baseUrlEnvName: string;
  /** Path as written in the specs, e.g. `/api/v1/me`. */
  path: string;
  /** Supabase access token; omitted for anonymous (PUBLIC route) calls. */
  token?: string | null;
  init?: GoApiRequestInit;
  timeoutMs?: number;
  cache?: RequestCache;
}

function buildUrl(baseUrl: string | undefined, envName: string, path: string) {
  if (!baseUrl) throw new Error(`${envName} is not configured`);
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`Go API path must start with a single "/": ${path}`);
  }
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/**
 * Shared transport for the server and browser Go API clients.
 * Resolves with the parsed JSON body (`undefined` for 204) and rejects with an
 * `ApiError` for every non-2xx response, timeout, network failure or unreadable
 * body. The caller owns validating the shape of the returned data.
 */
export async function requestGoApi<T = unknown>(
  options: GoApiRequestOptions,
): Promise<T> {
  const { baseUrl, baseUrlEnvName, path, token, init = {}, timeoutMs, cache } =
    options;
  const url = buildUrl(baseUrl, baseUrlEnvName, path);

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  const signals = [init.signal, timeoutMs ? AbortSignal.timeout(timeoutMs) : null]
    .filter((s): s is AbortSignal => s != null);

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache,
      signal: signals.length > 0 ? AbortSignal.any(signals) : undefined,
    });
  } catch (error) {
    // A deliberate abort by the caller is not an API failure; let it propagate.
    if (init.signal?.aborted) throw error;
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new ApiError(
      0,
      timedOut ? CLIENT_ERROR_CODES.timeout : CLIENT_ERROR_CODES.network,
      timedOut ? "Go API request timed out" : "Go API request failed",
    );
  }

  if (!response.ok) throw await parseApiError(response);
  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      response.status,
      CLIENT_ERROR_CODES.invalidResponse,
      "Go API returned a body that is not valid JSON",
    );
  }
}
