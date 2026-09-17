import { defineConfig } from "vitest/config";

export default defineConfig({
  // components rely on the automatic JSX runtime (Next.js default);
  // vitest's esbuild defaults to classic React.createElement otherwise
  esbuild: { jsx: "automatic" },
});
