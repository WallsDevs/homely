// Genera los PNG de la PWA desde los SVG de public/. Ejecutar: npm run icons -w @homely/client
// - favicon.svg (redondeado, fondo transparente): favicon e iconos "any".
// - icon-maskable.svg (cuadrado a sangre): Android recorta su propia forma e iOS redondea solo.
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = (file) => fileURLToPath(new URL(`../public/${file}`, import.meta.url));

const jobs = [
  ['favicon.svg', 'pwa-64x64.png', 64],
  ['favicon.svg', 'pwa-192x192.png', 192],
  ['favicon.svg', 'pwa-512x512.png', 512],
  ['icon-maskable.svg', 'maskable-icon-512x512.png', 512],
  ['icon-maskable.svg', 'apple-touch-icon-180x180.png', 180],
];

for (const [source, target, size] of jobs) {
  await sharp(pub(source), { density: 384 }).resize(size, size).png().toFile(pub(target));
  console.log(`✓ ${target}`);
}
