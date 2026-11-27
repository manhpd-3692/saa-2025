import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against the locally running stack (Next.js :3000, Go API :8080, local
 * Supabase); Playwright does not start servers. The signed-in state comes from
 * the local-only test session (`npm run e2e:session`, see e2e/README.md), never
 * from a Google login. Without that file, tests that need a session skip.
 */
const USER_STORAGE_STATE = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "logs/playwright/test-results",
  reporter: [["list"], ["html", { outputFolder: "logs/playwright/report", open: "never" }]],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    storageState: existsSync(USER_STORAGE_STATE) ? USER_STORAGE_STATE : undefined,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // Desktop only, minimum 1280 px (R17); screens are checked at 1440 x 1024.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1024 } },
    },
  ],
});
