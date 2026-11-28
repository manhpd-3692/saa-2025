import { isApiError } from "@/lib/api/api-error";
import { goApiBrowser } from "@/lib/api/go-api-browser";
import type { FieldError } from "./kudo-input-schema";

/**
 * Browser calls of the write-kudo window (F005 A2–A8) to the Go API with the
 * session's Bearer token. Images go straight to Storage through the Go-signed
 * upload URL (INT-001); the browser only ever keeps and sends `uploadId`s,
 * never storage paths (Codex R03).
 */

/** Upload PUT budget: a 5 MB image over a slow link. */
const IMAGE_PUT_TIMEOUT_MS = 30_000;

export interface SunnerOption {
  id: string;
  name: string;
  avatarUrl: string | null;
  unitCode: string | null;
}

export interface HashtagOption {
  id: string;
  name: string;
}

/** A6 prefill. */
export interface KudoEditForm {
  id: string;
  receiver: SunnerOption;
  title: string;
  contentHtml: string;
  hashtags: string[];
  images: { uploadId: string; url: string | null }[];
  isAnonymous: boolean;
}

/** A5/A7 body; `receiverId` is only read on create (the recipient is locked on edit). */
export interface KudoWriteBody {
  receiverId?: string;
  title: string;
  contentHtml: string;
  hashtags: string[];
  imageUploadIds: string[];
  isAnonymous: boolean;
}

export function searchSunners(query: string, signal?: AbortSignal): Promise<SunnerOption[]> {
  return goApiBrowser<SunnerOption[]>(`/api/v1/users/search?q=${encodeURIComponent(query)}`, { signal });
}

export function listHashtags(query: string, signal?: AbortSignal): Promise<HashtagOption[]> {
  return goApiBrowser<HashtagOption[]>(`/api/v1/hashtags?q=${encodeURIComponent(query)}`, { signal });
}

/** An image whose signed URL was issued but whose bytes did not reach Storage. */
export class ImageUploadError extends Error {
  constructor(readonly uploadId: string | null) {
    super("Image could not be uploaded");
    this.name = "ImageUploadError";
  }
}

/** A4 then INT-001: signed URL for the declared type/size, then PUT of the bytes. */
export async function uploadKudoImage(file: File): Promise<string> {
  let uploadId: string | null = null;
  try {
    const signed = await goApiBrowser<{ uploadId: string; uploadUrl: string }>("/api/v1/uploads/kudo-images", {
      method: "POST",
      body: { contentType: file.type, size: file.size },
    });
    uploadId = signed.uploadId;
    const response = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
      signal: AbortSignal.timeout(IMAGE_PUT_TIMEOUT_MS),
    });
    if (!response.ok) throw new ImageUploadError(uploadId);
    return uploadId;
  } catch (error) {
    throw error instanceof ImageUploadError ? error : new ImageUploadError(uploadId);
  }
}

/** A8, best-effort (AD05): a failure is ignored; the manual purge removes leftovers. */
export async function discardKudoUpload(uploadId: string): Promise<void> {
  try {
    await goApiBrowser(`/api/v1/uploads/${encodeURIComponent(uploadId)}`, { method: "DELETE" });
  } catch {
    // ignored on purpose
  }
}

export function createKudo(body: KudoWriteBody): Promise<{ kudoId: string }> {
  return goApiBrowser<{ kudoId: string }>("/api/v1/kudos", { method: "POST", body });
}

export function getKudoForEdit(kudoId: string): Promise<KudoEditForm> {
  return goApiBrowser<KudoEditForm>(`/api/v1/kudos/${encodeURIComponent(kudoId)}/edit`);
}

export function updateKudo(kudoId: string, body: KudoWriteBody): Promise<{ kudoId: string }> {
  return goApiBrowser<{ kudoId: string }>(`/api/v1/kudos/${encodeURIComponent(kudoId)}`, { method: "PATCH", body });
}

/** The field errors of a Go 422 `validation_failed` answer (DEC-001), or []. */
export function serverFieldErrors(error: unknown): FieldError[] {
  if (!isApiError(error) || error.status !== 422 || error.code !== "validation_failed") return [];
  const body = error.body as { error?: { fields?: unknown } } | undefined;
  const fields = body?.error?.fields;
  return Array.isArray(fields) ? (fields as FieldError[]) : [];
}
