import { cp, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(app, ".next/standalone/apps/web");
await access(join(target, "server.js"));
// Next traces the server; public and static assets must accompany it.
await cp(join(app, ".next/static"), join(target, ".next/static"), {
  recursive: true,
});
await cp(join(app, "public"), join(target, "public"), { recursive: true });
