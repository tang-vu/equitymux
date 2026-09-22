const path = require("node:path");

const common = {
  cwd: __dirname,
  autorestart: true,
  restart_delay: 5000,
  min_uptime: 30000,
  max_restarts: 10,
  kill_timeout: 12000,
  watch: false,
  time: true,
};

module.exports = {
  apps: [
    ...["api", "web"].map((role) => ({
      ...common,
      name: `equitymux-${role}`,
      script: path.join(__dirname, "scripts", "host-service.mjs"),
      interpreter: process.execPath,
      args: [role],
      shutdown_with_message: true,
      env: {
        EQUITYMUX_WSL_DISTRO: "Ubuntu",
        EQUITYMUX_HOST_ROOT: "/root/services/equitymux",
      },
    })),
    {
      ...common,
      name: "equitymux-tunnel",
      script: path.join(
        process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)",
        "cloudflared",
        "cloudflared.exe",
      ),
      interpreter: "none",
      args: [
        "tunnel",
        "--no-autoupdate",
        "--config",
        path.join(process.env.USERPROFILE, ".cloudflared", "equitymux.yml"),
        "run",
      ],
    },
  ],
};
