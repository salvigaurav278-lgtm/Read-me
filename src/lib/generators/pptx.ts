import PptxGenJS from "pptxgenjs";
import type { GeneratedContent, DeckContent } from "@/lib/ai/schemas";
import type { ExportMeta } from "./index";
import { resolveItemImage } from "./imageResolve";

interface Theme {
  bg: string;
  title: string;
  body: string;
  accent: string;
}

const THEMES: Record<string, Theme> = {
  BLUE: { bg: "FFFFFF", title: "1E40AF", body: "1F2937", accent: "3B82F6" },
  GREEN: { bg: "FFFFFF", title: "166534", body: "1F2937", accent: "22C55E" },
  DARK: { bg: "111827", title: "FFFFFF", body: "E5E7EB", accent: "818CF8" },
  MINIMAL: { bg: "FFFFFF", title: "111827", body: "374151", accent: "9CA3AF" },
  MODERN_EDUCATION: { bg: "F8FAFC", title: "4338CA", body: "1F2937", accent: "6366F1" },
};

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
  const theme = THEMES[deck.theme] ?? THEMES.MODERN_EDUCATION;
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

  deck.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.bg };

    const isCover = i === 0;
    if (isCover) {
      slide.addText(s.title, {
        x: 0.6,
        y: 2.4,
        w: 12.1,
        h: 1.5,
        fontSize: 40,
        bold: true,
        color: theme.title,
        align: "center",
      });
      slide.addText("Real Pathshala AI", {
        x: 0.6,
        y: 4.0,
        w: 12.1,
        h: 0.5,
        fontSize: 16,
        color: theme.accent,
        align: "center",
      });
    } else {
      slide.addText(s.title, {
        x: 0.6,
        y: 0.4,
        w: 12.1,
        h: 0.9,
        fontSize: 28,
        bold: true,
        color: theme.title,
      });
      slide.addShape(pptx.ShapeType.line, {
        x: 0.6,
        y: 1.35,
        w: 3,
        h: 0,
        line: { color: theme.accent, width: 3 },
      });
      const img = images[i];
      const bullets = s.bullets ?? [];
      if (bullets.length) {
        slide.addText(
          bullets.map((b) => ({ text: b, options: { bullet: true } })),
          {
            x: 0.8,
            y: 1.7,
            w: img ? 7.0 : 11.7, // leave room for the image on the right
            h: 5,
            fontSize: 18,
            color: theme.body,
            lineSpacingMultiple: 1.3,
            valign: "top",
          },
        );
      }
      if (img) {
        // Fit into a right-hand box (~5in wide, ~4.4in tall), preserve aspect.
        const boxW = 5.0;
        const boxH = 4.4;
        const ar = img.width / img.height;
        let w = boxW;
        let h = w / ar;
        if (h > boxH) {
          h = boxH;
          w = h * ar;
        }
        const x = 8.0 + (boxW - w) / 2;
        const y = 1.7 + (boxH - h) / 2;
        slide.addImage({ data: `data:${img.mime};base64,${img.buf.toString("base64")}`, x, y, w, h });
        slide.addText(img.caption, { x: 8.0, y: 1.7 + boxH + 0.05, w: boxW, h: 0.4, fontSize: 10, italic: true, color: "6B7280", align: "center" });
      }
    }
    if (s.notes) slide.addNotes(s.notes);
  });

  // pptxgenjs returns a Node Buffer for outputType "nodebuffer".
  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
