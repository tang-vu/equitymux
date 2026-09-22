import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // components rely on the automatic JSX runtime (Next.js default);
  // vitest's esbuild defaults to classic React.createElement otherwise
  esbuild: { jsx: "automatic" },
  test: { exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"] },
});
