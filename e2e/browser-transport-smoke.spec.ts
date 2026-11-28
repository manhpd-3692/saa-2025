import { existsSync } from "node:fs";
import { expect, test, type BrowserContext } from "@playwright/test";

/**
 * F002 SC-009 (Codex R06): a page on the frontend origin calls the Go API on
 * its own origin directly, with `Authorization: Bearer <Supabase access token>`
 * and no cookies; the browser preflights every call and Go's CORS answers
 * before auth. Requests are chosen to change no data: they prove the transport
 * (preflight passed, response readable), not the features behind it.
 */
const API_BASE_URL = (process.env.E2E_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");
const USER_STORAGE_STATE = "playwright/.auth/user.json";

/** Reads the access token from the `@supabase/ssr` session cookie (maybe chunked, `base64-` encoded). */
async function accessTokenFrom(context: BrowserContext, origin: string): Promise<string> {
  const parts = (await context.cookies(origin))
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => Number(a.name.split(".").at(1) ?? 0) - Number(b.name.split(".").at(1) ?? 0));
  const raw = parts.map((c) => c.value).join("");
  const json = raw.startsWith("base64-")
    ? Buffer.from(raw.slice("base64-".length), "base64url").toString("utf8")
    : decodeURIComponent(raw);
  const token = (JSON.parse(json) as { access_token?: unknown }).access_token;
  if (typeof token !== "string" || !token) throw new Error("No access token in the session cookie");
  return token;
}

interface CallResult {
  reached: boolean;
  status?: number;
  code?: string | null;
  failure?: string;
}

test("authenticated browser calls reach Go through CORS for every method", async ({ page, context, baseURL }) => {
  test.skip(!existsSync(USER_STORAGE_STATE), `needs ${USER_STORAGE_STATE}: run npm run e2e:session (e2e/README.md)`);
  const token = await accessTokenFrom(context, baseURL ?? "http://localhost:3000");
  await page.goto("/login?error=failed"); // any page on the frontend origin; Login stays with an error param

  const results = await page.evaluate(
    async ({ api, bearer }) => {
      const call = async (method: string, path: string, headers: Record<string, string> = {}, body?: string) => {
        try {
          const res = await fetch(api + path, {
            method,
            headers: { Authorization: `Bearer ${bearer}`, ...headers },
            body,
          });
          const parsed = await res.json().catch(() => null);
          return { reached: true, status: res.status, code: parsed?.error?.code ?? null };
        } catch (error) {
          return { reached: false, failure: String(error) };
        }
      };
      const missing = crypto.randomUUID();
      const json = { "Content-Type": "application/json" };
      return {
        me: await call("GET", "/api/v1/me"),
        create: await call("POST", "/api/v1/kudos", json, "{}"),
        edit: await call("PATCH", `/api/v1/kudos/${missing}`, json, "{}"),
        heart: await call("PUT", `/api/v1/kudos/${missing}/heart`),
        unheart: await call("DELETE", `/api/v1/kudos/${missing}/heart`),
        open: await call("POST", "/api/v1/me/secret-boxes/open", { "Idempotency-Key": "not-a-uuid" }),
      } satisfies Record<string, CallResult>;
    },
    { api: API_BASE_URL, bearer: token },
  );

  expect(results.me).toMatchObject({ reached: true, status: 200 });
  expect(results.create).toMatchObject({ reached: true, status: 422, code: "validation_failed" });
  // PATCH /api/v1/kudos/{id} (edit, F005 phase 6) reaches the handler; an unknown id is 404.
  expect(results.edit).toMatchObject({ reached: true, status: 404, code: "kudo_not_found" });
  expect(results.heart).toMatchObject({ reached: true, status: 404, code: "kudo_not_found" });
  expect(results.unheart).toMatchObject({ reached: true, status: 404, code: "kudo_not_found" });
  // The Idempotency-Key header passed the preflight and reached the handler.
  expect(results.open).toMatchObject({ reached: true, status: 400, code: "invalid_idempotency_key" });
});

test("preflight is answered 204 without a JWT for an allowed origin only", async ({ request, baseURL }) => {
  const origin = new URL(baseURL ?? "http://localhost:3000").origin;
  const preflight = (from: string) =>
    request.fetch(`${API_BASE_URL}/api/v1/kudos`, {
      method: "OPTIONS",
      headers: {
        Origin: from,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
      },
    });

  const allowed = await preflight(origin);
  expect(allowed.status()).toBe(204);
  expect(allowed.headers()).toMatchObject({
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE",
    "access-control-allow-headers": "Authorization, Content-Type, Idempotency-Key",
    "access-control-max-age": "600",
  });
  expect(allowed.headers()["access-control-allow-credentials"]).toBeUndefined();

  const other = await preflight("https://evil.example");
  expect(other.headers()["access-control-allow-origin"]).toBeUndefined();
});

test("a page on an origin outside FRONTEND_ORIGINS is blocked by the browser", async ({ page }) => {
  await page.goto("about:blank"); // opaque origin "null", not in FRONTEND_ORIGINS
  const outcome = await page.evaluate(async (api) => {
    try {
      await fetch(`${api}/api/v1/me`, { headers: { Authorization: "Bearer x" } });
      return "reached";
    } catch {
      return "blocked";
    }
  }, API_BASE_URL);
  expect(outcome).toBe("blocked");
});
