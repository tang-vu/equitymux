# Windows PM2 + Cloudflare Tunnel

The public research demo is hosted on the builder's machine at
https://equitymux.tangvu.dev. Windows PM2 manages `equitymux-api`,
`equitymux-web` and `equitymux-tunnel`, alongside the other hackathon services.
The dedicated tunnel forwards only to the web process on `127.0.0.1:3017`.
The API listens on `127.0.0.1:8017` and has no separate public tunnel route.

## Runtime

The application runs in WSL Ubuntu under `/root/services/equitymux`, not `/tmp`.
The repository keeps its normal `services/api/equitymux` layout. SQLite and DX
logs live under the runtime's `data/` and `dx/` directories. Keep these directories
when updating a release. Do not copy development `.env` files or wallet keys.

The supervisor pins `DEMO_MODE=true`, `EXECUTION_ENABLED=false` and
`EQUITYMUX_PUBLIC_DEMO=true`. The public web proxy permits reviewed reads and
stateless analysis, compilation and receipt verification. It rejects constitution
approval, execution, task creation and private DX diagnostics with HTTP 403.
These restrictions are a demo boundary, not multi-user authentication.

The Windows supervisor holds a pipe to its Linux supervisor. PM2 shutdown or
loss of the parent closes the pipe and terminates the child, preventing an old
process from retaining a port. PM2 restarts failed services with a delay.

## Build and operate

Sync committed source into the durable runtime without overwriting runtime data.
Inside WSL, run `pnpm install --frozen-lockfile`, `uv sync --frozen` from
`services/api`, then `pnpm build` from the repository root. The build script
prepares the standalone Next.js server including fonts and static assets.

From Windows in this repository:

```powershell
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save
pm2 logs equitymux-web --lines 40
pm2 restart equitymux-api equitymux-web
```

Cloudflare credentials and `equitymux.yml` stay outside git in
`%USERPROFILE%/.cloudflared/`. The dedicated tunnel config contains the tunnel
UUID, its credentials-file path, the hostname mapped to
`http://127.0.0.1:3017`, then a final `http_status:404` rule.
Use `cloudflared tunnel --config <path> ingress validate` before restarting it.

A per-user Windows logon task runs `scripts/start-host.ps1` with a hidden window.
This is logon recovery, not unattended boot before Windows login. `pm2 save`
preserves the process list, while the task starts only this project's services.
Do not restart all PM2 apps or modify another project's tunnel.

## Verify

Check `/api/health` locally and over HTTPS: service must be `equitymux-api`,
`demoMode=true`, `executionEnabled=false`. Run a recorded decision, replay its
receipt, and confirm `/api/constitution/approve` returns 403 through the public
web proxy. Test PM2 restart and confirm that ports 3017/8017 have one listener
each. Availability depends on this machine, WSL and its internet connection.

Reproduce the deployed checks with:

```powershell
node scripts/check-host.mjs https://equitymux.tangvu.dev
```

For Chromium, run `node scripts/check-public.mjs https://equitymux.tangvu.dev`
from `apps/web` in an environment with Playwright Chromium installed.

On 2026-09-22 both checks passed against the public HTTPS origin. The Windows
logon task was invoked manually and returned exit code 0; the API and web PIDs
changed, with exactly one listener remaining on each assigned port. All three
PM2 processes were online, and `pm2 save` persisted the process list. A full
machine reboot was not performed.

References: [Cloudflare local tunnels](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/create-local-tunnel/),
[PM2 ecosystem configuration](https://pm2.keymetrics.io/docs/usage/application-declaration/).
