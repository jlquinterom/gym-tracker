import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// En dev (`npm run dev`) sirve desde "/"; en build (para GitHub Pages) usa "/gym-tracker/".
// Así npm run dev y npm run build funcionan ambos sin tener que tocar nada manualmente.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/gym-tracker/" : "/",
  plugins: [
    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-512.png",
      ],
      manifest: {
        name: "gym-tracker",
        short_name: "Gym",
        description: "Seguimiento personal de entrenamientos de gimnasio",
        theme_color: "#2563eb",
        background_color: "#fafafa",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        scope: ".",
        lang: "es",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
      },
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],
}));
