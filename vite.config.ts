// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  cloudflare: false,
  plugins: [
    nitro({
      preset: "vercel",
      compatibilityDate: "2026-06-05",
      vercel: {
        functions: {
          runtime: "nodejs22.x",
        },
      },
    }),
  ],
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("wagmi") || id.includes("viem")) {
              return "wagmi-viem";
            }
            if (id.includes("graphql-request")) return "gql";
            return undefined;
          },
        },
      },
    },
  },
});
