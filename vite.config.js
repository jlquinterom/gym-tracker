import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// base se ajustará a "/gym-tracker/" en Story 2.4 cuando desplieguemos a GitHub Pages.
// Por ahora "./" para que funcione con `npm run preview` en cualquier ruta.
export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",
      // El manifest completo (name, icons, theme_color) se configura en Story 2.3.
      // De momento desactivado para mantener el scaffold mínimo y verificable.
      manifest: false,
      workbox: {
        navigateFallback: "/index.html",
      },
    }),
  ],
});
