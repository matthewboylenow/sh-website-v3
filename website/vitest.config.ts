import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Unit + server-render tests only. Nothing here talks to Neon, Vercel Blob
 * or the network — every suite runs offline against pure functions or
 * `renderToStaticMarkup` output. That is deliberate: CI has no database and
 * no secrets, so a green run means the logic is sound, not that the
 * environment happened to be reachable.
 *
 * No @vitejs/plugin-react. It pulls its own major of Vite and the two
 * copies collide under `tsc --noEmit`. esbuild's automatic JSX runtime is
 * all the tests need; there is no Fast Refresh in a test run.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "components/site/page-sections/**/*.tsx"],
    },
  },
});
