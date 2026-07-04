import PptxGenJS from "pptxgenjs";
import type { GeneratedContent, DeckContent } from "@/lib/ai/schemas";
import type { ExportMeta } from "./index";
import { resolveItemImage, type ResolvedImage } from "./imageResolve";

// Wide 16:9 canvas.
const SW = 13.33;
const SH = 7.5;

const INK = "1F2937";
const MUTED = "6B7280";
const PANEL = "FFFFFF";
const PAGE_BG = "F6F7FB";
const AMBER = "F59E0B";
const BRAND = "4338CA";

// Vivid accent colours rotated per content slide, so the deck feels lively.
const ACCENTS = ["6366F1", "EC4899", "10B981", "F59E0B", "0EA5E9", "8B5CF6", "EF4444", "14B8A6"];

/** Coerce any generated content into a deck so PPTX export always works. */
function toDeck(content: GeneratedContent): DeckContent {
  if (content.kind === "deck") return content;
  if (content.kind === "document") {
    return {
      kind: "deck",
      title: content.title,
      theme: "MODERN_EDUCATION",
      slides: [
        { title: content.title, bullets: [] },
        ...content.sections.map((s) => ({ title: s.heading, bullets: s.body, diagramId: s.diagramId, diagram: s.diagram })),
      ],
    };
  }
  return {
    kind: "deck",
    title: content.title,
    theme: "MODERN_EDUCATION",
    slides: [
      { title: content.title, bullets: [] },
      ...content.questions.map((q) => ({
        title: `Q${q.number}`,
        bullets: [q.text, ...(q.options ?? [])],
        diagramId: q.diagramId,
        diagram: q.diagram,
      })),
    ],
  };
}

export async function renderPptx(content: GeneratedContent, meta: ExportMeta = {}): Promise<Buffer> {
  const deck = toDeck(content);
  const scope = meta.projectId;
  const withImages = meta.images !== false;

  // Resolve a relevant image per content slide (skip the cover) up front, since
  // the slide layout below is synchronous.
  const images = await Promise.all(
    deck.slides.map((s, i) =>
      !withImages || i === 0
        ? Promise.resolve(null)
        : resolveItemImage(`${s.title} ${(s.bullets ?? []).join(" ")} ${s.notes ?? ""} ${s.diagram ?? ""}`, s.diagramId, s.diagram, scope),
    ),
  );

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Real Pathshala AI";
  const RR = pptx.ShapeType.roundRect;
  const RECT = pptx.ShapeType.rect;
  const ELL = pptx.ShapeType.ellipse;

  const metaLine = [meta.className, meta.subject].filter(Boolean).join("  •  ");
  const footerRight = [meta.chapter, meta.className].filter(Boolean).join("  •  ");

  deck.slides.forEach((s, i) => {
    const slide = pptx.addSlide();

    if (i === 0) {
      // ---------- Cover ----------
      slide.background = { color: BRAND };
      // Decorative translucent circles.
      slide.addShape(ELL, { x: 9.6, y: -1.8, w: 5.5, h: 5.5, fill: { color: "FFFFFF", transparency: 90 } });
      slide.addShape(ELL, { x: -1.5, y: 4.6, w: 4.6, h: 4.6, fill: { color: "FFFFFF", transparency: 92 } });
      slide.addShape(ELL, { x: 11.2, y: 5.4, w: 2.6, h: 2.6, fill: { color: AMBER, transparency: 70 } });
      // Brand chip.
      slide.addShape(RR, { x: 0.9, y: 0.9, w: 3.6, h: 0.6, rectRadius: 0.3, fill: { color: "FFFFFF", transparency: 82 } });
      slide.addText("REAL PATHSHALA AI", { x: 0.9, y: 0.9, w: 3.6, h: 0.6, fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle", charSpacing: 2 });
      // Title + accent underline + meta.
      slide.addText(s.title, { x: 0.9, y: 2.7, w: 11.5, h: 1.7, fontSize: 46, bold: true, color: "FFFFFF", align: "left", valign: "middle" });
      slide.addShape(RECT, { x: 1.0, y: 4.45, w: 2.2, h: 0.09, fill: { color: AMBER } });
      if (metaLine) slide.addText(metaLine, { x: 0.95, y: 4.7, w: 11, h: 0.5, fontSize: 18, color: "E0E7FF" });
      if (s.notes) slide.addNotes(s.notes);
      return;
    }

    // ---------- Content slide ----------
    const accent = ACCENTS[(i - 1) % ACCENTS.length];
    slide.background = { color: PAGE_BG };

    // Header band.
    slide.addShape(RECT, { x: 0, y: 0, w: SW, h: 1.2, fill: { color: accent } });
    slide.addShape(RECT, { x: 0, y: 1.2, w: SW, h: 0.05, fill: { color: "FFFFFF", transparency: 60 } });
    slide.addText(s.title, { x: 0.6, y: 0, w: 11.2, h: 1.2, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
    // Slide-number badge.
    slide.addShape(ELL, { x: 12.35, y: 0.32, w: 0.56, h: 0.56, fill: { color: "FFFFFF" } });
    slide.addText(String(i), { x: 12.35, y: 0.32, w: 0.56, h: 0.56, fontSize: 15, bold: true, color: accent, align: "center", valign: "middle" });

    const img = images[i];
    const bullets = (s.bullets ?? []).filter(Boolean);
    const bodyTop = 1.6;
    const bodyH = 4.9;
    const panelW = img ? 7.2 : 12.13;

    // Bullet panel with a coloured left rail.
    slide.addShape(RR, { x: 0.6, y: bodyTop, w: panelW, h: bodyH, rectRadius: 0.08, fill: { color: PANEL }, line: { color: "E5E7EB", width: 1 } });
    slide.addShape(RR, { x: 0.6, y: bodyTop, w: 0.16, h: bodyH, rectRadius: 0.06, fill: { color: accent } });
    if (bullets.length) {
      slide.addText(
        bullets.map((b) => ({ text: b, options: { bullet: { code: "2022", indent: 18 }, color: INK, breakLine: true } })),
        { x: 1.0, y: bodyTop + 0.25, w: panelW - 0.7, h: bodyH - 0.5, fontSize: img ? 17 : 18, color: INK, lineSpacingMultiple: 1.35, valign: "top" },
      );
    }

    if (img) {
      drawFramedImage(slide, pptx, img, accent);
    } else {
      // No photo → a decorative accent card so the slide still feels designed.
      slide.addShape(ELL, { x: 11.3, y: 5.2, w: 2.9, h: 2.9, fill: { color: accent, transparency: 90 } });
      slide.addShape(ELL, { x: 12.0, y: 6.0, w: 1.5, h: 1.5, fill: { color: accent, transparency: 80 } });
    }

    // Footer.
    slide.addShape(RECT, { x: 0, y: SH - 0.5, w: SW, h: 0.5, fill: { color: "EEF0F6" } });
    slide.addText("Real Pathshala AI", { x: 0.6, y: SH - 0.5, w: 5, h: 0.5, fontSize: 10, bold: true, color: accent, valign: "middle" });
    if (footerRight) slide.addText(footerRight, { x: SW - 6.6, y: SH - 0.5, w: 6, h: 0.5, fontSize: 9, color: MUTED, align: "right", valign: "middle" });

    if (s.notes) slide.addNotes(s.notes);
  });

  // pptxgenjs returns a Node Buffer for outputType "nodebuffer".
  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}

/** Draw the resolved image inside a white rounded frame with an accent border. */
function drawFramedImage(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  img: ResolvedImage,
  accent: string,
) {
  const frameX = 8.15;
  const frameY = 1.6;
  const frameW = 4.58;
  const frameH = 4.9;
  slide.addShape(pptx.ShapeType.roundRect, { x: frameX, y: frameY, w: frameW, h: frameH, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: accent, width: 1.5 } });

  const boxW = frameW - 0.4;
  const boxH = frameH - 0.9;
  const ar = img.width / img.height || 1.5;
  let w = boxW;
  let h = w / ar;
  if (h > boxH) {
    h = boxH;
    w = h * ar;
  }
  const x = frameX + (frameW - w) / 2;
  const y = frameY + 0.2 + (boxH - h) / 2;
  slide.addImage({ data: `data:${img.mime};base64,${img.buf.toString("base64")}`, x, y, w, h });
  slide.addText(img.caption, { x: frameX + 0.1, y: frameY + frameH - 0.55, w: frameW - 0.2, h: 0.45, fontSize: 10, italic: true, color: MUTED, align: "center", valign: "middle" });
}
