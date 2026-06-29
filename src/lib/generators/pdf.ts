import { readFileSync } from "fs";
import { join } from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { GeneratedContent } from "@/lib/ai/schemas";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const PRIMARY = rgb(0.29, 0.27, 0.8);
const MUTED = rgb(0.4, 0.4, 0.45);
const BLACK = rgb(0.1, 0.1, 0.12);

const FONT_DIR = join(process.cwd(), "src", "lib", "generators", "fonts");

/** Load a vendored TTF; returns null if it can't be read (triggers fallback). */
function loadFont(file: string): Uint8Array | null {
  try {
    return new Uint8Array(readFileSync(join(FONT_DIR, file)));
  } catch {
    return null;
  }
}

// Replacements so the Helvetica fallback (WinAnsi) never throws on the
// Greek/math/typographic characters Gemini emits for CBSE content.
const ASCII_MAP: Record<string, string> = {
  "×": "x", "÷": "/", "−": "-", "–": "-", "—": "-", "‘": "'", "’": "'",
  "“": '"', "”": '"', "•": "-", "·": "-", "…": "...", "→": "->", "←": "<-",
  "⇒": "=>", "≤": "<=", "≥": ">=", "≠": "!=", "±": "+/-", "≈": "~", "∞": "inf",
  "√": "sqrt", "∑": "sum", "∫": "integral", "°": " deg", "′": "'", "″": '"',
  "½": "1/2", "¼": "1/4", "¾": "3/4", "²": "^2", "³": "^3", "⁄": "/",
  "π": "pi", "θ": "theta", "α": "alpha", "β": "beta", "γ": "gamma",
  "δ": "delta", "Δ": "Delta", "λ": "lambda", "μ": "mu", "ω": "omega",
  "Ω": "ohm", "φ": "phi", "ρ": "rho", "σ": "sigma", "τ": "tau",
};

function sanitizeToWinAnsi(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ASCII_MAP[ch]) out += ASCII_MAP[ch];
    else if (ch.codePointAt(0)! < 128) out += ch;
    else out += "?"; // last-resort so drawText can always encode
  }
  return out;
}

/** Minimal flowing-text PDF writer with word-wrap and pagination. */
class PdfWriter {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  /** True when the Unicode font loaded; false → sanitize text before drawing. */
  unicode = false;
  y = 0;

  async init() {
    this.doc = await PDFDocument.create();

    const regular = loadFont("DejaVuSans.ttf");
    const boldBytes = loadFont("DejaVuSans-Bold.ttf");

    if (regular && boldBytes) {
      // Full Unicode support (Greek, math symbols, arrows, typographic punctuation).
      this.doc.registerFontkit(fontkit);
      this.font = await this.doc.embedFont(regular, { subset: true });
      this.bold = await this.doc.embedFont(boldBytes, { subset: true });
      this.unicode = true;
    } else {
      // Fallback: standard fonts + text sanitization so export never fails.
      this.font = await this.doc.embedFont(StandardFonts.Helvetica);
      this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
      this.unicode = false;
    }
    this.addPage();
  }

  /** Make a string safe to draw with the active font. */
  private safe(text: string): string {
    return this.unicode ? text : sanitizeToWinAnsi(text);
  }

  addPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - MARGIN;
  }

  private ensure(space: number) {
    if (this.y - space < MARGIN) this.addPage();
  }

  private wrap(text: string, font: PDFFont, size: number, width: number) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  text(
    text: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {},
  ) {
    const size = opts.size ?? 11;
    const font = opts.bold ? this.bold : this.font;
    const indent = opts.indent ?? 0;
    const width = A4[0] - MARGIN * 2 - indent;
    const lineHeight = size * 1.45;
    for (const line of this.wrap(this.safe(text), font, size, width)) {
      this.ensure(lineHeight);
      this.page.drawText(line, {
        x: MARGIN + indent,
        y: this.y,
        size,
        font,
        color: opts.color ?? BLACK,
      });
      this.y -= lineHeight;
    }
    if (opts.gap) this.y -= opts.gap;
  }

  heading(text: string) {
    this.y -= 6;
    this.text(text, { size: 15, bold: true, color: PRIMARY, gap: 4 });
  }

  bullet(text: string) {
    const size = 11;
    const lineHeight = size * 1.45;
    this.ensure(lineHeight);
    this.page.drawText(this.unicode ? "•" : "-", {
      x: MARGIN + 6,
      y: this.y,
      size,
      font: this.font,
      color: PRIMARY,
    });
    this.text(text, { indent: 20, gap: 2 });
  }

  title(text: string, subtitle?: string) {
    this.text(text, { size: 22, bold: true, gap: subtitle ? 2 : 10 });
    if (subtitle) this.text(subtitle, { size: 11, color: MUTED, gap: 12 });
  }

  async save() {
    return Buffer.from(await this.doc.save());
  }
}

export async function renderPdf(content: GeneratedContent): Promise<Buffer> {
  const w = new PdfWriter();
  await w.init();
  w.title(content.title, "Generated with Real Pathshala AI");

  if (content.kind === "document") {
    for (const s of content.sections) {
      w.heading(s.heading);
      for (const b of s.body) w.bullet(b);
      if (s.formulas?.length) {
        for (const f of s.formulas) w.text(`${f.name}:  ${f.expression}`, { bold: true, indent: 12, gap: 2 });
      }
    }
    if (content.keyPoints?.length) {
      w.heading("Key Points");
      for (const k of content.keyPoints) w.bullet(k);
    }
  } else if (content.kind === "paper") {
    const meta: string[] = [];
    if (content.totalMarks) meta.push(`Maximum Marks: ${content.totalMarks}`);
    if (content.durationMin) meta.push(`Time: ${content.durationMin} min`);
    if (meta.length) w.text(meta.join("     "), { bold: true, color: MUTED, gap: 6 });
    if (content.instructions?.length) {
      w.heading("General Instructions");
      for (const i of content.instructions) w.bullet(i);
    }
    w.heading("Questions");
    for (const q of content.questions) {
      w.text(`Q${q.number}. (${q.marks} mark${q.marks === 1 ? "" : "s"})  ${q.text}`, { bold: true, gap: 2 });
      if (q.options?.length) {
        q.options.forEach((o, i) => w.text(`(${String.fromCharCode(97 + i)}) ${o}`, { indent: 16 }));
      }
      w.y -= 4;
    }
    const hasAnswers = content.questions.some((q) => q.answer || q.solution?.length);
    if (hasAnswers) {
      w.addPage();
      w.heading("Answer Key & Solutions");
      for (const q of content.questions) {
        if (!q.answer && !q.solution?.length) continue;
        w.text(`Q${q.number}.`, { bold: true, gap: 2 });
        if (q.answer) w.text(`Answer: ${q.answer}`, { indent: 12 });
        q.solution?.forEach((step, i) => w.text(`${i + 1}. ${step}`, { indent: 12 }));
        w.y -= 4;
      }
    }
  } else {
    // deck → printable outline
    content.slides.forEach((slide, i) => {
      w.heading(`Slide ${i + 1}: ${slide.title}`);
      slide.bullets?.forEach((b) => w.bullet(b));
      if (slide.notes) w.text(`Notes: ${slide.notes}`, { size: 10, color: MUTED, indent: 12, gap: 4 });
    });
  }

  return w.save();
}
