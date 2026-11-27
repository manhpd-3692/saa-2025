/**
 * LOCAL-ONLY: runs SQL as postgres in the local Supabase DB container, the way
 * `create-local-test-session.ts` sets up its identities (`wsl docker` on Windows). Specs use it to
 * change a demo user's stored role and put it back (F001 SC-008). Never import this from `src/`.
 */
import { spawnSync } from "node:child_process";

const DB_CONTAINER = process.env.SAA_DB_CONTAINER ?? "supabase_db_saa-2025";

export function runLocalSql(sql: string): string {
  const docker = process.platform === "win32" ? ["wsl", "docker"] : ["docker"];
  const args = [...docker, "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-qAt"];
  let failure = "";
  // `wsl` can time out (WSAETIMEDOUT) on a cold start: wake it with `wsl -e true`, then retry.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = spawnSync(args[0], args.slice(1), { input: sql, encoding: "utf8", timeout: 40_000 });
    if (res.status === 0) return res.stdout.trim();
    failure = `${res.stderr}${res.stdout}`.replaceAll("\0", "").trim() || String(res.error);
    if (process.platform === "win32") spawnSync("wsl", ["-e", "true"], { timeout: 40_000 });
  }
  throw new Error(`psql in container "${DB_CONTAINER}" failed:\n${failure}`);
}

/** Sets `users.role` for one demo email and returns the role now stored. */
export function setStoredRole(email: string, role: "user" | "admin"): string {
  if (!/^[a-z0-9.+-]+@sun-asterisk\.com$/.test(email)) throw new Error(`unexpected test email ${email}`);
  return runLocalSql(`update public.users set role = '${role}' where email = '${email}' returning role;`);
}
