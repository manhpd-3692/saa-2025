import { existsSync } from "node:fs";
import { test } from "@playwright/test";

/** Storage states written by `npm run e2e:session` (see e2e/README.md). */
export const USER_STATE = "playwright/.auth/user.json";
export const ADMIN_STATE = "playwright/.auth/admin.json";
export const ANONYMOUS = { cookies: [], origins: [] };

/** For `test.use`: the state file when it exists, otherwise a signed-out context. */
export const stateOrAnonymous = (file: string) => (existsSync(file) ? file : ANONYMOUS);

/** Skips the calling test with a hint when its storage state is missing. */
export const requireState = (file: string) =>
  test.skip(!existsSync(file), `needs ${file}: run npm run e2e:session (e2e/README.md)`);

/** Demo users of the `live` seed with a `users` row (role `user`). */
export const DEMO_SUNNER_01 = { userId: "d0000000-0000-4000-8000-000000000001", email: "sunner01.demo@sun-asterisk.com", name: "Nguyễn Văn An" };
export const DEMO_SUNNER_02 = { userId: "d0000000-0000-4000-8000-000000000002", email: "sunner02.demo@sun-asterisk.com", name: "Trần Thị Bình" };
