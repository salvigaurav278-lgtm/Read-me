// Normalise uploaded/fetched images for print-quality PDF embedding:
// convert to PNG (pdf-lib embeds PNG/JPEG only, so SVG/WebP are rasterised),
// ensure >= minWidth, cap the max width, and strip metadata.

import sharp from "sharp";

export interface Optimized {
  buf: Buffer;
  mime: "image/png";
  width: number;
  height: number;
}

export async function optimizeForPdf(input: Buffer, minWidth = 1200): Promise<Optimized | null> {
  try {
    // density helps SVG rasterise crisply.
    const meta = await sharp(input, { density: 220 }).metadata();
    const origW = meta.width ?? 0;
    const targetW = Math.min(2000, Math.max(minWidth, origW || minWidth));
    const buf = await sharp(input, { density: 220 })
      .resize({ width: targetW, withoutEnlargement: false })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const out = await sharp(buf).metadata();
    return { buf, mime: "image/png", width: out.width ?? targetW, height: out.height ?? 0 };
  } catch {
    return null;
  }
}
