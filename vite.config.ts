import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

let reactDevLocatorEnabled = false;

try {
  await import('babel-plugin-react-dev-locator');
  reactDevLocatorEnabled = true;
} catch {
  // The locator is also optional in local environments where the package is unavailable.
}

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    sourcemap: 'hidden',
    // Inline local sprite PNGs into the bundle so exported single HTML
    // does not depend on external asset files when opened directly.
    assetsInlineLimit: 10 * 1024 * 1024,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        game: path.resolve(__dirname, "game/index.html"),
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: reactDevLocatorEnabled ? ['react-dev-locator'] : [],
      },
    }),
    tsconfigPaths()
  ],
})
