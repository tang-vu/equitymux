import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // workspace root — required so standalone traces the pnpm node_modules
  // (deps live outside apps/web; without this the image misses `next`).
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // NOTE: /api/* is proxied by app/api/[...path]/route.ts at RUNTIME so
  // EQUITYMUX_API is honored in containers (rewrites bake at build time).
};

export default nextConfig;
