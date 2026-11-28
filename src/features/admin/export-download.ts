/**
 * Browser download of a Go CSV export (A3, A6) under Codex N11: the file is
 * saved only after the whole body has arrived. A non-2xx answer, a network
 * failure, a timeout or a body cut off part-way (Go aborts the connection on a
 * late failure, so the body read rejects) saves nothing. The file name comes
 * from `Content-Disposition`, readable cross-origin because Go exposes it (R06).
 */

/** Above Go's 20 s export deadline (R23), so Go's own outcome arrives first. */
export const EXPORT_TIMEOUT_MS = 25_000;

export type ExportOutcome =
  | { kind: "saved"; filename: string }
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "failed" };

/** `filename` of an attachment header (RFC 6266, quoted or token, `filename*` first). */
export function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      // fall through to the plain parameter
    }
  }
  const plain = /filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;\s]+))/i.exec(header);
  const name = plain?.[1]?.replace(/\\(.)/g, "$1") ?? plain?.[2];
  return name?.trim() || fallback;
}

export interface DownloadExportOptions {
  url: string;
  token: string | null;
  fallbackName: string;
  /** Hands the complete file to the browser (see `saveBlob`). */
  save: (blob: Blob, filename: string) => void;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function downloadExport({
  url,
  token,
  fallbackName,
  save,
  fetchImpl = fetch,
  timeoutMs = EXPORT_TIMEOUT_MS,
}: DownloadExportOptions): Promise<ExportOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { kind: "failed" };
  }
  if (response.status === 401) return { kind: "unauthorized" };
  if (response.status === 403) return { kind: "forbidden" };
  if (!response.ok) return { kind: "failed" };

  let blob: Blob;
  try {
    blob = await response.blob(); // rejects when the connection is aborted mid-body
  } catch {
    return { kind: "failed" };
  }
  const filename = filenameFromContentDisposition(response.headers.get("Content-Disposition"), fallbackName);
  save(blob, filename);
  return { kind: "saved", filename };
}

export interface RunExportOptions extends Omit<DownloadExportOptions, "url" | "token"> {
  /** `NEXT_PUBLIC_API_BASE_URL`; missing → the export fails instead of throwing. */
  apiBase: string | undefined;
  /** Go export path with its query, e.g. `/api/v1/admin/users/export?unit=…`. */
  path: string;
  /** The browser session's access token; a failure here only means no token (Go answers 401). */
  getToken: () => Promise<string | null>;
}

/**
 * The whole Export click: builds the URL, reads the token, downloads. It never rejects, so
 * the button always leaves its busy state (phase 11 review W1): any unexpected error,
 * a missing API base included, is a failed export the admin can retry.
 */
export async function runExport({ apiBase, path, getToken, ...download }: RunExportOptions): Promise<ExportOutcome> {
  try {
    if (!apiBase) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    const token = await getToken().catch(() => null);
    return await downloadExport({ ...download, url: `${apiBase.replace(/\/+$/, "")}${path}`, token });
  } catch {
    return { kind: "failed" };
  }
}

/** Saves a complete blob under `filename` through a temporary download link. */
export function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked later: revoking at once can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
