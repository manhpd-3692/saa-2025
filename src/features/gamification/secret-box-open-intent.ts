import { CLIENT_ERROR_CODES, isApiError } from "@/lib/api/api-error";
import type { OpenResult } from "./gamification-api";

/**
 * One opening intent of the secret box window (Codex R12): it holds a single
 * Idempotency-Key from the first attempt until a definite answer, so Retry
 * after a lost response sends the same key and Go replays the stored result
 * instead of opening another box (N12). The next box is a new intent.
 */
export class SecretBoxOpenIntent {
  private key: string | null = null;

  constructor(private readonly newKey: () => string = () => crypto.randomUUID()) {}

  /** The key of the intent in progress, or a fresh one for a new intent. */
  keyForAttempt(): string {
    this.key ??= this.newKey();
    return this.key;
  }

  /** A definite answer arrived: the next attempt is a new intent. */
  settle(): void {
    this.key = null;
  }
}

/**
 * True when the open may have committed although no answer was read: no
 * response at all (network, timeout), an unreadable body, or a 5xx. Only then
 * is the key kept for Retry; a 4xx (no box left, expired session) consumed nothing.
 */
export function isUncertainOpenFailure(error: unknown): boolean {
  if (!isApiError(error)) return true;
  if (error.code === CLIENT_ERROR_CODES.invalidResponse) return true;
  return error.status === 0 || error.status >= 500;
}

export type OpenAttempt = { ok: true; result: OpenResult } | { ok: false; error: unknown; retryable: boolean };

/** Sends one attempt of the current intent and settles it unless the outcome is uncertain. */
export async function attemptOpen(intent: SecretBoxOpenIntent, open: (key: string) => Promise<OpenResult>): Promise<OpenAttempt> {
  const key = intent.keyForAttempt();
  try {
    const result = await open(key);
    intent.settle();
    return { ok: true, result };
  } catch (error) {
    const retryable = isUncertainOpenFailure(error);
    if (!retryable) intent.settle();
    return { ok: false, error, retryable };
  }
}
