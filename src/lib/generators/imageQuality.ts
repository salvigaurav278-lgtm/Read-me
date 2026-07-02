// Image quality validation for fetched educational images.
// Pure functions (no I/O) so they are unit-testable without network access.

export interface ImageSize {
  width: number;
  height: number;
  mime: "image/png" | "image/jpeg" | "image/svg+xml" | "unknown";
}

/** Read width/height from a PNG IHDR chunk. */
function pngSize(buf: Buffer): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 24) return null;
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null;
  // IHDR width/height are the two big-endian uint32 at offsets 16 and 20.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Read width/height from a JPEG SOF marker. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) {
      off++;
      continue;
    }
    const marker = buf[off + 1];
    const len = buf.readUInt16BE(off + 2);
    // SOF0..SOF15 except DHT(c4), JPG(c8), DAC(cc)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    }
    off += 2 + len;
  }
  return null;
}

export function imageSize(buf: Buffer): ImageSize | null {
  const png = pngSize(buf);
  if (png) return { ...png, mime: "image/png" };
  const jpg = jpegSize(buf);
  if (jpg) return { ...jpg, mime: "image/jpeg" };
  // crude SVG sniff
  const head = buf.subarray(0, 256).toString("utf8").toLowerCase();
  if (head.includes("<svg")) return { width: 0, height: 0, mime: "image/svg+xml" };
  return null;
}

export interface QualityOptions {
  minWidth?: number;
  maxBytes?: number;
}

export interface QualityResult {
  ok: boolean;
  reason?: string;
  size?: ImageSize;
}

/**
 * Validate a fetched image: must be a raster (pdf-lib can embed PNG/JPEG),
 * at least `minWidth` px wide, and within a sane byte range. SVG is rejected
 * here because it cannot be embedded directly — request a rendered raster
 * thumbnail instead.
 */
export function validateImage(buf: Buffer, opts: QualityOptions = {}): QualityResult {
  const minWidth = opts.minWidth ?? 1200;
  const maxBytes = opts.maxBytes ?? 8 * 1024 * 1024;
  if (!buf || buf.length < 1024) return { ok: false, reason: "empty or too small" };
  if (buf.length > maxBytes) return { ok: false, reason: "exceeds max bytes" };
  const size = imageSize(buf);
  if (!size) return { ok: false, reason: "unrecognised format" };
  if (size.mime === "image/svg+xml") return { ok: false, reason: "svg not embeddable; request a raster thumbnail" };
  if (size.mime === "unknown") return { ok: false, reason: "unknown format" };
  if (size.width < minWidth) return { ok: false, reason: `width ${size.width} < ${minWidth}` };
  return { ok: true, size };
}
