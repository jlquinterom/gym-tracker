// Genera los iconos PWA a partir de un SVG inline.
// Uso: `npm run generate-icons` (o `node scripts/generate-icons.mjs`).
// Salidas en public/icons/ y public/apple-touch-icon.png.

import sharp from "sharp";
import { Buffer } from "node:buffer";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ICONS_DIR = resolve(ROOT, "public", "icons");
const PUBLIC_DIR = resolve(ROOT, "public");

mkdirSync(ICONS_DIR, { recursive: true });

const ACCENT = "#2563eb";
const TEXT_COLOR = "#ffffff";
const LETTER = "G"; // letra principal en el icono

/**
 * Genera el SVG fuente. `safeArea` = porcentaje de margen interior para variantes maskable.
 */
function buildSvg(size, safeArea = 0) {
  const fontSize = (size - size * safeArea * 2) * 0.62;
  const cy = size * 0.535; // ligero ajuste óptico vertical
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${ACCENT}"/>
      <text x="${size / 2}" y="${cy}" text-anchor="middle" dominant-baseline="central"
            fill="${TEXT_COLOR}" font-family="-apple-system, system-ui, sans-serif"
            font-size="${fontSize}" font-weight="900">${LETTER}</text>
    </svg>
  `;
}

async function generate(svg, outPath, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${outPath} (${size}x${size})`);
}

console.log(`Generando iconos en ${ICONS_DIR}…`);

// Iconos normales (any purpose)
await generate(buildSvg(512), resolve(ICONS_DIR, "icon-192.png"), 192);
await generate(buildSvg(512), resolve(ICONS_DIR, "icon-512.png"), 512);

// Icono maskable (con safe area del 12.5% por borde — recomendación de spec)
await generate(
  buildSvg(512, 0.125),
  resolve(ICONS_DIR, "icon-maskable-512.png"),
  512,
);

// Apple touch icon (iOS Safari usa 180x180 para Add to Home Screen)
await generate(
  buildSvg(512),
  resolve(PUBLIC_DIR, "apple-touch-icon.png"),
  180,
);

console.log("\n✅ Iconos generados.");
