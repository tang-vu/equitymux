import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:3017", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "uv run --directory ../../services/api uvicorn equitymux.api.main:app --host 127.0.0.1 --port 8017",
      url: "http://127.0.0.1:8017/api/config",
      env: { DEMO_MODE: "true", EXECUTION_ENABLED: "false" },
      timeout: 120_000,
    },
    {
      command: "node .next/standalone/apps/web/server.js",
      url: "http://127.0.0.1:3017",
      env: {
        EQUITYMUX_API: "http://127.0.0.1:8017",
        HOSTNAME: "127.0.0.1",
        PORT: "3017",
      },
      timeout: 120_000,
    },
  ],
});
