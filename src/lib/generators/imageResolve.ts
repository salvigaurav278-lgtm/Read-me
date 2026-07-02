// Resolve a topic to an embeddable raster (PNG/JPEG) + caption, for DOCX/PPTX
// exports. Vector diagrams are rasterised from their SVG via sharp; cached /
// fetched / uploaded images are used as-is. Mirrors the PDF resolution order
// (per-project override → shared cache → online fetch) and never throws.

import sharp from "sharp";
import { matchConcept, conceptLabel } from "./diagramRegistry";
import { acquireImage } from "./imageSources";
import { renderDiagramSvg } from "./svgDiagram";

export interface ResolvedImage {
  buf: Buffer;
  mime: "image/png" | "image/jpeg";
  width: number;
  height: number;
  caption: string;
}

export async function resolveItemImage(
  text: string,
  aiId: string | undefined,
  caption: string | undefined,
  scope?: string,
): Promise<ResolvedImage | null> {
  try {
    const c = matchConcept(text, aiId);
    if (!c) return null;

    const got = await acquireImage(c.id, c.query, { allowFetch: !c.hasVector, scope });
    if (got) {
      const mime = got.mime === "image/jpeg" ? "image/jpeg" : "image/png";
      return {
        buf: got.buf,
        mime,
        width: got.meta.width || 640,
        height: got.meta.height || 400,
        caption: caption || conceptLabel(c.id),
      };
    }

    if (c.hasVector) {
      const svg = renderDiagramSvg(c.id, 320, 200);
      const buf = await sharp(Buffer.from(svg)).resize({ width: 640 }).png().toBuffer();
      const m = await sharp(buf).metadata();
      return {
        buf,
        mime: "image/png",
        width: m.width || 640,
        height: m.height || 400,
        caption: caption || conceptLabel(c.id),
      };
    }
    return null;
  } catch {
    return null;
  }
}
