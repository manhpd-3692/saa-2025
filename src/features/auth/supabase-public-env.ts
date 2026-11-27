/**
 * The Supabase URL and publishable key; the frontend holds no other Supabase
 * secret (Codex R21). `NEXT_PUBLIC_*` must be referenced literally.
 */
export function supabasePublicEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set",
    );
  }
  return { url, publishableKey };
}
