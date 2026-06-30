import { readFileSync } from "fs";
import { join } from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { GeneratedContent } from "@/lib/ai/schemas";
import type { ExportMeta } from "./index";

// ───────────────────────── layout & theme ─────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MX = 46; // left/right margin
const CONTENT_W = PAGE_W - MX * 2;
const TOP = PAGE_H - 66; // content top (below header)
const BOTTOM = 54; // content bottom (above footer)

const INDIGO = rgb(0.31, 0.27, 0.9);
const INDIGO_DK = rgb(0.21, 0.18, 0.62);
const INDIGO_TINT = rgb(0.93, 0.93, 1.0);
const GREEN = rgb(0.09, 0.6, 0.36);
const GREEN_TINT = rgb(0.9, 0.97, 0.93);
const RED = rgb(0.83, 0.18, 0.25);
const RED_TINT = rgb(0.99, 0.92, 0.92);
const AMBER = rgb(0.85, 0.52, 0.02);
const AMBER_TINT = rgb(1.0, 0.96, 0.86);
const INK = rgb(0.11, 0.12, 0.17);
const MUTED = rgb(0.46, 0.48, 0.55);
const BORDER = rgb(0.84, 0.85, 0.9);
const CARD = rgb(0.975, 0.977, 0.99);
const WHITE = rgb(1, 1, 1);

const FONT_DIR = join(process.cwd(), "src", "lib", "generators", "fonts");
function loadFont(file: string): Uint8Array | null {
  try {
    return new Uint8Array(readFileSync(join(FONT_DIR, file)));
  } catch {
    return null;
  }
}

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
function sanitize(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ASCII_MAP[ch]) out += ASCII_MAP[ch];
    else if (ch.codePointAt(0)! < 128) out += ch;
    else out += "?";
  }
  return out;
}

// Deterministic PRNG for the faux-QR placeholder.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ───────────────────────── PDF engine ─────────────────────────

interface PdfOpts {
  size?: number;
  bold?: boolean;
  color?: RGB;
  gap?: number;
}

class Pdf {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  unicode = false;
  y = 0;
  pageNo = 0;
  brand = "Real Pathshala AI";
  meta: ExportMeta = {};

  async init() {
    this.doc = await PDFDocument.create();
    const reg = loadFont("DejaVuSans.ttf");
    const bld = loadFont("DejaVuSans-Bold.ttf");
    if (reg && bld) {
      this.doc.registerFontkit(fontkit);
      this.font = await this.doc.embedFont(reg, { subset: true });
      this.bold = await this.doc.embedFont(bld, { subset: true });
      this.unicode = true;
    } else {
      this.font = await this.doc.embedFont(StandardFonts.Helvetica);
      this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
      this.unicode = false;
    }
  }

  private safe(t: string): string {
    return this.unicode ? t : sanitize(t);
  }
  private dot(): string {
    return this.unicode ? "•" : "-";
  }

  widthOf(t: string, size: number, bold = false): number {
    return (bold ? this.bold : this.font).widthOfTextAtSize(this.safe(t), size);
  }

  wrap(text: string, size: number, width: number, bold = false): string[] {
    const font = bold ? this.bold : this.font;
    const out: string[] = [];
    for (const para of String(text).split("\n")) {
      const words = para.split(/\s+/).filter(Boolean);
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(this.safe(test), size) > width && line) {
          out.push(line);
          line = w;
        } else line = test;
      }
      out.push(line);
    }
    return out.length ? out : [""];
  }

  /** Height a wrapped block would occupy. */
  blockHeight(text: string, size: number, width: number, bold = false): number {
    return this.wrap(text, size, width, bold).length * size * 1.42;
  }

  // ---- pages ----

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pageNo += 1;
    this.drawHeader();
    this.drawFooter();
    this.y = TOP;
  }

  ensure(h: number) {
    if (this.y - h < BOTTOM) this.newPage();
  }

  private rawText(t: string, x: number, baseline: number, size: number, font: PDFFont, color: RGB) {
    this.page.drawText(this.safe(t), { x, y: baseline, size, font, color });
  }

  private drawHeader() {
    const yTop = PAGE_H - 30;
    // brand chip
    this.page.drawRectangle({ x: MX, y: yTop - 4, width: 14, height: 14, color: INDIGO });
    this.rawText("RP", MX + 2.2, yTop - 1.5, 8, this.bold, WHITE);
    this.rawText(this.brand, MX + 20, yTop - 1.5, 9, this.bold, INK);
    const right = [this.meta.className, this.meta.subject].filter(Boolean).join("  •  ");
    if (right) {
      const w = this.widthOf(right, 9);
      this.rawText(right, PAGE_W - MX - w, yTop - 1.5, 9, this.font, MUTED);
    }
    this.page.drawLine({
      start: { x: MX, y: yTop - 12 },
      end: { x: PAGE_W - MX, y: yTop - 12 },
      thickness: 0.8,
      color: BORDER,
    });
  }

  private drawFooter() {
    const yB = 34;
    this.page.drawLine({
      start: { x: MX, y: yB + 12 },
      end: { x: PAGE_W - MX, y: yB + 12 },
      thickness: 0.8,
      color: BORDER,
    });
    this.rawText("realpathshala.app", MX, yB, 8, this.font, MUTED);
    const mid = `Page ${this.pageNo}`;
    this.rawText(mid, (PAGE_W - this.widthOf(mid, 8)) / 2, yB, 8, this.font, MUTED);
    const r = this.meta.chapter || "Premium CBSE Notes";
    const rt = r.length > 40 ? r.slice(0, 38) + "…" : r;
    this.rawText(rt, PAGE_W - MX - this.widthOf(rt, 8), yB, 8, this.font, MUTED);
  }

  // ---- flow primitives ----

  /** Draw wrapped text at the current cursor; advances y. */
  flow(text: string, x: number, width: number, o: PdfOpts = {}) {
    const size = o.size ?? 10.5;
    const lh = size * 1.42;
    const font = o.bold ? this.bold : this.font;
    const color = o.color ?? INK;
    for (const line of this.wrap(text, size, width, o.bold)) {
      this.ensure(lh);
      this.rawText(line, x, this.y - size, size, font, color);
      this.y -= lh;
    }
    if (o.gap) this.y -= o.gap;
  }

  bullet(text: string, x = MX, color: RGB = INDIGO) {
    const size = 10.5;
    const lh = size * 1.42;
    this.ensure(lh);
    this.page.drawCircle({ x: x + 3, y: this.y - size + 3.2, size: 1.7, color });
    this.flow(text, x + 12, CONTENT_W - 12 - (x - MX), { size });
  }

  gap(h: number) {
    this.y -= h;
  }

  // ───────────────────────── components ─────────────────────────

  sectionHeader(n: number, title: string) {
    const h = 26;
    this.ensure(h + 8);
    const y = this.y - h;
    this.page.drawRectangle({ x: MX, y, width: CONTENT_W, height: h, color: INDIGO });
    // number chip
    this.page.drawRectangle({ x: MX + 6, y: y + 5, width: 16, height: 16, color: WHITE, opacity: 0.18 });
    const ns = String(n).padStart(2, "0");
    this.rawText(ns, MX + 6 + (16 - this.widthOf(ns, 9, true)) / 2, y + 9, 9, this.bold, WHITE);
    this.rawText(this.fit(title, 13, CONTENT_W - 44), MX + 30, y + 8.5, 13, this.bold, WHITE);
    this.y = y - 10;
  }

  /** Tinted callout with a colored left accent bar (tip / mistake / note). */
  callout(label: string, body: string, kind: "tip" | "mistake" | "note") {
    const map = {
      tip: { c: GREEN, t: GREEN_TINT, icon: this.unicode ? "💡 " : "" },
      mistake: { c: RED, t: RED_TINT, icon: this.unicode ? "⚠ " : "" },
      note: { c: INDIGO, t: INDIGO_TINT, icon: "" },
    }[kind];
    const padX = 12;
    const innerW = CONTENT_W - padX * 2 - 4;
    const labelH = 13;
    const bodyH = this.blockHeight(body, 10, innerW);
    const h = 10 + labelH + bodyH + 4;
    this.ensure(h + 6);
    const y = this.y - h;
    this.page.drawRectangle({ x: MX, y, width: CONTENT_W, height: h, color: map.t });
    this.page.drawRectangle({ x: MX, y, width: 4, height: h, color: map.c });
    this.rawText(map.icon + label, MX + padX, this.y - 14, 10, this.bold, map.c);
    this.y -= 10 + labelH;
    this.flow(body, MX + padX, innerW, { size: 10, color: INK });
    this.y = y - 8;
  }

  formulaBox(name: string, expr: string) {
    const padX = 12;
    const innerW = CONTENT_W - padX * 2;
    const nameH = name ? 12 : 0;
    const exprH = this.blockHeight(expr, 12, innerW, true);
    const h = 9 + nameH + exprH + 6;
    this.ensure(h + 6);
    const y = this.y - h;
    this.page.drawRectangle({
      x: MX, y, width: CONTENT_W, height: h,
      color: rgb(0.98, 0.98, 0.92), borderColor: AMBER, borderWidth: 1,
    });
    this.page.drawRectangle({ x: MX, y, width: 4, height: h, color: AMBER });
    if (name) {
      this.rawText("ƒ  " + name.toUpperCase(), MX + padX, this.y - 13, 8.5, this.bold, AMBER);
      this.y -= 9 + nameH;
    } else this.y -= 9;
    this.flow(expr, MX + padX, innerW, { size: 12, bold: true, color: INK });
    this.y = y - 8;
  }

  /** Two-column grid of key-point cards (doubles as an infographic strip). */
  keyPointCards(title: string, items: string[]) {
    if (!items.length) return;
    this.miniLabel(title, INDIGO);
    const gapX = 10;
    const colW = (CONTENT_W - gapX) / 2;
    const innerW = colW - 30;
    for (let i = 0; i < items.length; i += 2) {
      const pair = items.slice(i, i + 2);
      const heights = pair.map((t) => Math.max(28, 14 + this.blockHeight(t, 9.5, innerW)));
      const rowH = Math.max(...heights);
      this.ensure(rowH + 8);
      const yTop = this.y;
      pair.forEach((t, j) => {
        const x = MX + j * (colW + gapX);
        const y = yTop - rowH;
        this.page.drawRectangle({ x, y, width: colW, height: rowH, color: CARD, borderColor: BORDER, borderWidth: 0.8 });
        this.page.drawCircle({ x: x + 14, y: yTop - 14, size: 8, color: INDIGO_TINT });
        const num = String(i + j + 1);
        this.rawText(num, x + 14 - this.widthOf(num, 9, true) / 2, yTop - 17, 9, this.bold, INDIGO);
        // text block
        let ty = yTop - 11;
        for (const line of this.wrap(t, 9.5, innerW)) {
          this.rawText(line, x + 26, ty - 9.5, 9.5, this.font, INK);
          ty -= 9.5 * 1.4;
        }
      });
      this.y = yTop - rowH - 8;
    }
  }

  diagram(caption: string) {
    const h = 86;
    this.ensure(h + 6);
    const y = this.y - h;
    this.page.drawRectangle({ x: MX, y, width: CONTENT_W, height: h, color: rgb(0.96, 0.97, 1.0), borderColor: INDIGO, borderWidth: 1, borderOpacity: 0.4 });
    // simple "image" icon (sun + mountains) on the left
    const ix = MX + 36, iy = y + h / 2;
    this.page.drawRectangle({ x: ix - 24, y: iy - 18, width: 48, height: 36, color: WHITE, borderColor: INDIGO, borderWidth: 1, borderOpacity: 0.5 });
    this.page.drawCircle({ x: ix + 8, y: iy + 6, size: 4, color: AMBER });
    this.page.drawLine({ start: { x: ix - 22, y: iy - 4 }, end: { x: ix - 6, y: iy + 6 }, thickness: 1.5, color: INDIGO });
    this.page.drawLine({ start: { x: ix - 6, y: iy + 6 }, end: { x: ix + 6, y: iy - 6 }, thickness: 1.5, color: INDIGO });
    this.page.drawLine({ start: { x: ix + 6, y: iy - 6 }, end: { x: ix + 22, y: iy + 8 }, thickness: 1.5, color: INDIGO });
    // caption
    const tx = MX + 78;
    const tw = CONTENT_W - 78 - 14;
    this.rawText(this.unicode ? "🖼  FIGURE" : "FIGURE", tx, y + h - 16, 8.5, this.bold, INDIGO);
    let ty = y + h - 30;
    for (const line of this.wrap(caption, 9.5, tw).slice(0, 4)) {
      this.rawText(line, tx, ty, 9.5, this.font, INK);
      ty -= 13;
    }
    this.rawText("Scan the QR on the cover for the animated version.", tx, y + 10, 7.5, this.font, MUTED);
    this.y = y - 8;
  }

  pyqBlock(items: { question: string; answer?: string; year?: string }[]) {
    if (!items.length) return;
    this.bandTitle("Previous Year Questions (CBSE)", INDIGO_DK);
    items.forEach((q, i) => {
      const innerW = CONTENT_W - 24;
      const qH = this.blockHeight(`Q${i + 1}. ${q.question}`, 10, innerW, true);
      const aH = q.answer ? this.blockHeight(`Ans. ${q.answer}`, 9.5, innerW) : 0;
      const h = 12 + qH + (aH ? aH + 4 : 0) + 8;
      this.ensure(h + 6);
      const y = this.y - h;
      this.page.drawRectangle({ x: MX, y, width: CONTENT_W, height: h, color: CARD, borderColor: BORDER, borderWidth: 0.8 });
      this.page.drawRectangle({ x: MX, y, width: 3, height: h, color: INDIGO });
      if (q.year) {
        const tag = q.year;
        const w = this.widthOf(tag, 7.5, true) + 10;
        this.page.drawRectangle({ x: PAGE_W - MX - w - 8, y: this.y - 16, width: w, height: 13, color: INDIGO_TINT });
        this.rawText(tag, PAGE_W - MX - w - 3, this.y - 13, 7.5, this.bold, INDIGO);
      }
      this.y -= 12;
      this.flow(`Q${i + 1}. ${q.question}`, MX + 12, innerW - 40, { size: 10, bold: true });
      if (q.answer) {
        this.gap(2);
        this.flow(`Ans. ${q.answer}`, MX + 12, innerW, { size: 9.5, color: rgb(0.16, 0.45, 0.28) });
      }
      this.y = y - 8;
    });
  }

  summaryBox(items: string[]) {
    if (!items.length) return;
    this.bandTitle("Chapter Summary", GREEN);
    const padX = 12;
    const innerW = CONTENT_W - padX * 2 - 12;
    let h = 12;
    for (const it of items) h += this.blockHeight(it, 10, innerW) + 5;
    h += 6;
    this.ensure(h + 6);
    const y = this.y - h;
    this.page.drawRectangle({ x: MX, y, width: CONTENT_W, height: h, color: GREEN_TINT, borderColor: GREEN, borderWidth: 1, borderOpacity: 0.5 });
    this.y -= 10;
    for (const it of items) {
      this.ensure(this.blockHeight(it, 10, innerW) + 5);
      this.page.drawCircle({ x: MX + padX + 2, y: this.y - 7, size: 1.8, color: GREEN });
      this.flow(it, MX + padX + 12, innerW, { size: 10, gap: 3 });
    }
    this.y = Math.min(this.y, y) - 8;
  }

  qr(x: number, y: number, size: number, seed: string, caption: string) {
    const n = 21;
    const m = size / n;
    this.page.drawRectangle({ x, y, width: size, height: size, color: WHITE, borderColor: rgb(0.8, 0.8, 0.85), borderWidth: 1 });
    const rnd = mulberry32(hash(seed));
    const finder = (fx: number, fy: number) => {
      this.page.drawRectangle({ x: x + fx * m, y: y + fy * m, width: 7 * m, height: 7 * m, color: INK });
      this.page.drawRectangle({ x: x + (fx + 1) * m, y: y + (fy + 1) * m, width: 5 * m, height: 5 * m, color: WHITE });
      this.page.drawRectangle({ x: x + (fx + 2) * m, y: y + (fy + 2) * m, width: 3 * m, height: 3 * m, color: INK });
    };
    const inFinder = (cx: number, cy: number) =>
      (cx < 8 && cy >= n - 8) || (cx < 8 && cy < 8) || (cx >= n - 8 && cy >= n - 8);
    for (let cx = 0; cx < n; cx++)
      for (let cy = 0; cy < n; cy++) {
        if (inFinder(cx, cy)) continue;
        if (rnd() > 0.55)
          this.page.drawRectangle({ x: x + cx * m, y: y + cy * m, width: m, height: m, color: INK });
      }
    finder(0, n - 7);
    finder(0, 0);
    finder(n - 7, n - 7);
    if (caption) {
      const w = this.widthOf(caption, 7);
      this.rawText(caption, x + (size - w) / 2, y - 11, 7, this.font, MUTED);
    }
  }

  // small helpers
  private miniLabel(text: string, color: RGB) {
    this.ensure(20);
    this.rawText(text.toUpperCase(), MX, this.y - 10, 9.5, this.bold, color);
    this.page.drawLine({ start: { x: MX, y: this.y - 15 }, end: { x: MX + 40, y: this.y - 15 }, thickness: 2, color });
    this.y -= 22;
  }
  bandTitle(text: string, color: RGB) {
    const h = 22;
    this.ensure(h + 8);
    const y = this.y - h;
    this.page.drawRectangle({ x: MX, y, width: CONTENT_W, height: h, color, opacity: 0.12 });
    this.page.drawRectangle({ x: MX, y, width: 4, height: h, color });
    this.rawText(text, MX + 12, y + 7, 12, this.bold, color);
    this.y = y - 10;
  }
  private fit(text: string, size: number, width: number): string {
    let t = this.safe(text);
    if (this.widthOf(text, size, true) <= width) return text;
    while (t.length > 4 && this.font.widthOfTextAtSize(t + "…", size) > width) t = t.slice(0, -1);
    return t + "…";
  }

  // ───────────────────────── cover ─────────────────────────

  cover(title: string, subtitle: string, seed: string) {
    this.newPage();
    // top brand band
    const bandH = 224;
    const by = PAGE_H - bandH;
    this.page.drawRectangle({ x: 0, y: by, width: PAGE_W, height: bandH, color: INDIGO });
    this.page.drawRectangle({ x: 0, y: by, width: PAGE_W, height: 8, color: AMBER });
    // logo + wordmark
    this.page.drawRectangle({ x: MX, y: PAGE_H - 70, width: 34, height: 34, color: WHITE });
    this.rawText("RP", MX + 7, PAGE_H - 60, 16, this.bold, INDIGO);
    this.rawText("REAL PATHSHALA AI", MX + 44, PAGE_H - 52, 15, this.bold, WHITE);
    this.rawText("Premium CBSE Coaching Notes", MX + 44, PAGE_H - 66, 9, this.font, rgb(0.85, 0.85, 1));
    // title (max 2 lines so it never collides with the subtitle chip)
    const titleSize = 24;
    let lines = this.wrap(title, titleSize, CONTENT_W - 130, true);
    if (lines.length > 2) {
      lines = lines.slice(0, 2);
      lines[1] = lines[1].replace(/\s+\S*$/, "").trimEnd() + "…";
    }
    let ty = PAGE_H - 128;
    for (const line of lines) {
      this.rawText(line, MX, ty, titleSize, this.bold, WHITE);
      ty -= 30;
    }
    // subtitle chip, anchored near the band bottom
    if (subtitle) {
      const w = this.widthOf(subtitle, 10, true) + 20;
      this.page.drawRectangle({ x: MX, y: by + 30, width: w, height: 20, color: WHITE, opacity: 0.18 });
      this.rawText(subtitle, MX + 10, by + 36, 10, this.bold, WHITE);
    }
    // QR on the band (placeholder)
    this.qr(PAGE_W - MX - 88, by + 24, 88, seed, "");
    this.rawText(this.unicode ? "▣ Scan for video lecture" : "Scan for video lecture", PAGE_W - MX - 150, by + 14, 7.5, this.font, rgb(0.8, 0.8, 1));

    // feature chips below band
    let cy = by - 28;
    const chips = ["NCERT-aligned", "Formula Boxes", "Tips & Tricks", "PYQs", "Summary"];
    let cx = MX;
    for (const c of chips) {
      const w = this.widthOf(c, 8.5, true) + 16;
      if (cx + w > PAGE_W - MX) break;
      this.page.drawRectangle({ x: cx, y: cy, width: w, height: 18, color: INDIGO_TINT });
      this.rawText(c, cx + 8, cy + 5.5, 8.5, this.bold, INDIGO_DK);
      cx += w + 8;
    }

    // "How to use" mini legend
    cy -= 30;
    this.rawText("WHAT'S INSIDE", MX, cy, 10, this.bold, INK);
    cy -= 6;
    this.page.drawLine({ start: { x: MX, y: cy }, end: { x: MX + 44, y: cy }, thickness: 2, color: AMBER });
    cy -= 18;
    const legend: [RGB, string][] = [
      [AMBER, "Formula boxes — every key formula highlighted"],
      [GREEN, "Tips & Tricks — exam-smart shortcuts"],
      [RED, "Common Mistakes — what to avoid in the exam"],
      [INDIGO, "Key Point cards & chapter summary"],
    ];
    for (const [c, t] of legend) {
      this.page.drawRectangle({ x: MX, y: cy - 1, width: 10, height: 10, color: c });
      this.rawText(t, MX + 18, cy, 9.5, this.font, INK);
      cy -= 18;
    }

    // footer tagline
    this.rawText(
      "Generated by Real Pathshala AI  •  realpathshala.app",
      MX, 70, 9, this.font, MUTED,
    );
    this.rawText(
      this.unicode ? "Crafted like Allen / PW premium notes — for CBSE Class 10, 11 & 12." : "Crafted like premium coaching notes - for CBSE Class 10, 11 & 12.",
      MX, 56, 8.5, this.font, MUTED,
    );
  }

  async save() {
    return Buffer.from(await this.doc.save());
  }
}

// ───────────────────────── renderers ─────────────────────────

function renderDocument(p: Pdf, c: Extract<GeneratedContent, { kind: "document" }>) {
  c.sections.forEach((s, i) => {
    p.sectionHeader(i + 1, s.heading);
    for (const b of s.body) p.bullet(b);
    for (const f of s.formulas ?? []) p.formulaBox(f.name, f.expression);
    if (s.diagram) p.diagram(s.diagram);
    if (s.keyPoints?.length) p.keyPointCards("Key Points", s.keyPoints);
    if (s.tip) p.callout("TIP & TRICK", s.tip, "tip");
    if (s.mistake) p.callout("COMMON MISTAKE", s.mistake, "mistake");
    p.gap(6);
  });

  if (c.keyPoints?.length) p.keyPointCards("Key Highlights", c.keyPoints);
  for (const t of c.tips ?? []) p.callout("TIP & TRICK", t, "tip");
  for (const m of c.commonMistakes ?? []) p.callout("COMMON MISTAKE", m, "mistake");
  if (c.pyqs?.length) p.pyqBlock(c.pyqs);
  if (c.summary?.length) p.summaryBox(c.summary);
}

function renderPaper(p: Pdf, c: Extract<GeneratedContent, { kind: "paper" }>) {
  p.bandTitle("Question Paper", INDIGO_DK);
  const meta: string[] = [];
  if (c.totalMarks) meta.push(`Maximum Marks: ${c.totalMarks}`);
  if (c.durationMin) meta.push(`Time Allowed: ${c.durationMin} min`);
  if (meta.length) {
    p.flow(meta.join("          "), MX, CONTENT_W, { size: 11, bold: true, color: INDIGO_DK, gap: 6 });
  }
  if (c.instructions?.length) {
    p.callout("GENERAL INSTRUCTIONS", c.instructions.map((i) => `• ${i}`).join("\n"), "note");
  }

  c.questions.forEach((q) => {
    const marks = `[${q.marks} mark${q.marks === 1 ? "" : "s"}]`;
    const head = `Q${q.number}.  ${q.text}`;
    p.ensure(p.blockHeight(head, 10.5, CONTENT_W - 60, true) + 16);
    const yStart = p.y;
    // marks badge
    const w = p.widthOf(marks, 8, true) + 10;
    p.page.drawRectangle({ x: PAGE_W - MX - w, y: yStart - 13, width: w, height: 13, color: INDIGO_TINT });
    p.page.drawText(marks, { x: PAGE_W - MX - w + 5, y: yStart - 10, size: 8, font: p.bold, color: INDIGO });
    p.flow(head, MX, CONTENT_W - w - 8, { size: 10.5, bold: true });
    for (let i = 0; i < (q.options?.length ?? 0); i++) {
      p.flow(`(${String.fromCharCode(97 + i)})  ${q.options![i]}`, MX + 16, CONTENT_W - 16, { size: 10 });
    }
    p.gap(6);
  });

  const withAns = c.questions.filter((q) => q.answer || q.solution?.length);
  if (withAns.length) {
    p.newPage();
    p.bandTitle("Answer Key & Solutions", GREEN);
    for (const q of withAns) {
      p.ensure(24);
      p.flow(`Q${q.number}.`, MX, CONTENT_W, { size: 10.5, bold: true });
      if (q.answer) p.flow(`Answer: ${q.answer}`, MX + 12, CONTENT_W - 12, { size: 10, color: rgb(0.16, 0.45, 0.28) });
      (q.solution ?? []).forEach((step, i) => p.flow(`${i + 1}. ${step}`, MX + 12, CONTENT_W - 12, { size: 10 }));
      p.gap(6);
    }
  }
}

function renderDeck(p: Pdf, c: Extract<GeneratedContent, { kind: "deck" }>) {
  c.slides.forEach((s, i) => {
    p.sectionHeader(i + 1, s.title);
    for (const b of s.bullets ?? []) p.bullet(b);
    if (s.notes) p.callout("SPEAKER NOTES", s.notes, "note");
    p.gap(6);
  });
}

export async function renderPdf(
  content: GeneratedContent,
  meta: ExportMeta = {},
): Promise<Buffer> {
  const p = new Pdf();
  p.meta = meta;
  await p.init();

  const subtitle =
    (content.kind === "document" && content.subtitle) ||
    [meta.className, meta.subject].filter(Boolean).join("  •  ") ||
    "CBSE Premium Notes";

  p.cover(content.title, subtitle, content.title + (meta.chapter ?? ""));
  p.newPage();

  if (content.kind === "document") renderDocument(p, content);
  else if (content.kind === "paper") renderPaper(p, content);
  else renderDeck(p, content);

  return p.save();
}
