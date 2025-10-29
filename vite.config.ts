import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  base: (globalThis as Record<string, unknown>)["GITHUB_REPOSITORY"]
    ? "/MediaSpawner/"
    : "/",
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      template: "treemap", // treemap | sunburst | network
      open: false, // set true to auto-open after build
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          moment: ["moment", "moment-timezone"],
          media: ["react-freezeframe"],
          "ui-button": ["src/components/ui/Button.tsx"],
          "ui-card": ["src/components/ui/Card.tsx"],
          "ui-switch": ["src/components/ui/Switch.tsx"],
          "ui-input": ["src/components/ui/Input.tsx"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    restoreMocks: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "lcov"],
      exclude: ["**/node_modules/**", "**/dist/**"],
    },
  },
});
