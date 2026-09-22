// Windows PM2 owns the process; a pipe lease prevents orphaned WSL services.
import { spawn } from "node:child_process";
import path from "node:path";

const role = process.argv[2];
if (!["api", "web"].includes(role)) throw new Error("Expected api or web");
const root =
  process.argv[3] ||
  process.env.EQUITYMUX_HOST_ROOT ||
  "/root/services/equitymux";
const windows = process.platform === "win32";
let stopping = false;
let timer;
const env = {
  ...process.env,
  NODE_ENV: "production",
  DEMO_MODE: "true",
  EXECUTION_ENABLED: "false",
  EQUITYMUX_PUBLIC_DEMO: "true",
  EQUITYMUX_REPO_ROOT: root,
  EQUITYMUX_API: "http://127.0.0.1:8017",
  CORS_ORIGINS: "https://equitymux.tangvu.dev,http://localhost:3017",
  HOSTNAME: "127.0.0.1",
  PORT: "3017",
};

const command = windows
  ? path.join(process.env.SystemRoot || "C:/Windows", "System32", "wsl.exe")
  : role === "api"
    ? `${root}/services/api/.venv/bin/python`
    : process.execPath;
const args = windows
  ? [
      "-d",
      process.env.EQUITYMUX_WSL_DISTRO || "Ubuntu",
      "-u",
      "root",
      "--cd",
      root,
      "--exec",
      "/usr/local/bin/node",
      `${root}/scripts/host-service.mjs`,
      role,
      root,
    ]
  : role === "api"
    ? [
        "-m",
        "uvicorn",
        "equitymux.api.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8017",
      ]
    : [`${root}/apps/web/.next/standalone/apps/web/server.js`];

const child = spawn(command, args, {
  cwd: windows ? undefined : role === "api" ? `${root}/services/api` : root,
  env,
  windowsHide: true,
  stdio: [windows ? "pipe" : "ignore", "inherit", "inherit"],
});

function stop() {
  if (stopping) return;
  stopping = true;
  if (windows) child.stdin.end();
  else child.kill("SIGTERM");
  timer = setTimeout(() => child.kill("SIGKILL"), 8000);
  timer.unref();
}

if (!windows) {
  process.stdin.resume();
  process.stdin.once("end", stop);
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
process.on("message", (message) => {
  if (message === "shutdown") stop();
});
child.once("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.once("exit", (code) => {
  clearTimeout(timer);
  process.exit(stopping ? 0 : (code ?? 1));
});
