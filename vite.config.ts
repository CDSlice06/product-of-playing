import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

let traeBadgePlugin:
  | ((options: {
      variant: 'dark' | 'light';
      position: string;
      prodOnly: boolean;
      clickable: boolean;
      clickUrl: string;
      autoTheme: boolean;
      autoThemeTarget: string;
    }) => unknown)
  | undefined;
let reactDevLocatorEnabled = false;

try {
  const badgeModule = await import('vite-plugin-trae-solo-badge');
  traeBadgePlugin = badgeModule.traeBadgePlugin;
} catch {
  // This Trae-only badge plugin is optional for local development.
}

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
  },
  plugins: [
    react({
      babel: {
        plugins: reactDevLocatorEnabled ? ['react-dev-locator'] : [],
      },
    }),
    ...(traeBadgePlugin
      ? [traeBadgePlugin({
          variant: 'dark',
          position: 'bottom-right',
          prodOnly: true,
          clickable: true,
          clickUrl: 'https://www.trae.ai/solo?showJoin=1',
          autoTheme: true,
          autoThemeTarget: '#root'
        })]
      : []),
    tsconfigPaths()
  ],
})
