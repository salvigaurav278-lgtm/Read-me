// Generates the Android launcher icon PNGs from the Real Pathshala brand mark:
// a white "Sparkles" glyph on the brand indigo (#4F46E5) — the same mark the
// web app uses in its sidebar. Run: node scripts/gen-android-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const RES = new URL("../android/app/src/main/res/", import.meta.url).pathname;
const INDIGO = "#4F46E5";

// A lucide-style "Sparkles": one large 4-point star plus two small ones,
// drawn in a 0..100 space centred roughly on the canvas.
function sparkleGroup(fill) {
  const star = (cx, cy, r, k) =>
    `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} ` +
    `Q${cx + k} ${cy + k} ${cx} ${cy + r} ` +
    `Q${cx - k} ${cy + k} ${cx - r} ${cy} ` +
    `Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
  return (
    `<path d="${star(48, 54, 30, 4.5)}" fill="${fill}"/>` +
    `<path d="${star(80, 30, 12, 1.8)}" fill="${fill}"/>` +
    `<path d="${star(24, 82, 8, 1.2)}" fill="${fill}"/>`
  );
}

// Full-bleed square icon (used for legacy/round; sharp masks the circle).
const fullIconSvg = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${INDIGO}"/>${sparkleGroup("#FFFFFF")}</svg>`;

// Adaptive foreground: transparent, mark kept inside the ~66% safe zone.
const foregroundSvg = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <g transform="translate(50 50) scale(0.62) translate(-50 -50)">${sparkleGroup("#FFFFFF")}</g></svg>`;

const circleMask = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );

async function png(svg, out) {
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(out);
}
async function pngRound(svg, size, out) {
  await mkdir(dirname(out), { recursive: true });
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(base).composite([{ input: circleMask(size), blend: "dest-in" }]).png().toFile(out);
}

// Launcher densities: [folder, square px, adaptive-foreground px]
const D = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
];

for (const [d, sq, fg] of D) {
  await png(fullIconSvg(sq), join(RES, `mipmap-${d}`, "ic_launcher.png"));
  await pngRound(fullIconSvg(sq), sq, join(RES, `mipmap-${d}`, "ic_launcher_round.png"));
  await png(foregroundSvg(fg), join(RES, `mipmap-${d}`, "ic_launcher_foreground.png"));
}

console.log("Android launcher PNGs regenerated from the Sparkles brand mark.");
