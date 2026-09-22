import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.EQUITYMUX_E2E_API_PORT ?? "8017";
const webPort = process.env.EQUITYMUX_E2E_WEB_PORT ?? "3017";
const apiUrl = "http://127.0.0.1:" + apiPort;
const webUrl = "http://127.0.0.1:" + webPort;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: webUrl, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "uv run --directory ../../services/api uvicorn equitymux.api.main:app --host 127.0.0.1 --port " +
        apiPort,
      url: apiUrl + "/api/config",
      env: { DEMO_MODE: "true", EXECUTION_ENABLED: "false" },
      timeout: 120_000,
    },
    {
      command: "node .next/standalone/apps/web/server.js",
      url: webUrl,
      env: {
        EQUITYMUX_API: apiUrl,
        HOSTNAME: "127.0.0.1",
        PORT: webPort,
      },
      timeout: 120_000,
    },
  ],
});
