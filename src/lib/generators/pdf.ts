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
import { getBranding, type Branding } from "./branding";
import { getDiagram, type DiagramCtx } from "./diagrams";
import { matchConcept, readPngAsset } from "./diagramRegistry";
import { acquireImage } from "./imageSources";
import type { PDFImage } from "pdf-lib";

// ───────────────────────── layout & theme ─────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MX = 24;
const CONTENT_W = PAGE_W - MX * 2;
const GUTTER = 14;
const COL_W = (CONTENT_W - GUTTER) / 2;

const HEADER_H = 46;
const HEADER_TOP = PAGE_H - 16; // top edge of header band
const CHAP_H = 24;
const CHAP_TOP = HEADER_TOP - HEADER_H - 6; // top edge of chapter banner
const CONTENT_TOP = CHAP_TOP - CHAP_H - 12;
const FOOTER_TOP = 56; // top edge of footer band
const CONTENT_BOTTOM = FOOTER_TOP + 10;

const NAVY = rgb(0.08, 0.12, 0.35);
const NAVY_DK = rgb(0.05, 0.08, 0.25);
const AMBER = rgb(0.96, 0.6, 0.09);
const AMBER_DK = rgb(0.82, 0.45, 0.02);
const INK = rgb(0.13, 0.15, 0.2);
const MUTED = rgb(0.46, 0.48, 0.55);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.09, 0.58, 0.36);
const GREEN_TINT = rgb(0.9, 0.97, 0.93);
const RED = rgb(0.83, 0.2, 0.27);
const RED_TINT = rgb(0.99, 0.92, 0.92);
const YELLOW_TINT = rgb(1.0, 0.96, 0.82);
const LINEC = rgb(0.86, 0.87, 0.91);

// Rotating card colors (header + tint) — mirrors the reference's varied cards.
const CARD_COLORS: { head: RGB; tint: RGB }[] = [
  { head: rgb(0.76, 0.12, 0.42), tint: rgb(0.99, 0.93, 0.96) }, // magenta
  { head: rgb(0.14, 0.55, 0.34), tint: rgb(0.92, 0.97, 0.94) }, // green
  { head: rgb(0.12, 0.5, 0.62), tint: rgb(0.91, 0.97, 0.98) }, // teal
  { head: rgb(0.45, 0.28, 0.68), tint: rgb(0.96, 0.94, 0.99) }, // purple
  { head: rgb(0.86, 0.42, 0.09), tint: rgb(1.0, 0.96, 0.9) }, // orange
  { head: rgb(0.16, 0.35, 0.74), tint: rgb(0.93, 0.95, 0.99) }, // blue
  { head: rgb(0.7, 0.2, 0.2), tint: rgb(0.99, 0.93, 0.92) }, // red
  { head: rgb(0.2, 0.5, 0.28), tint: rgb(0.93, 0.97, 0.93) }, // leaf
];

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
/** Linear blend of two colors (t=0 → a, t=1 → b). */
function mix(a: RGB, b: RGB, t: number): RGB {
  return rgb(
    a.red + (b.red - a.red) * t,
    a.green + (b.green - a.green) * t,
    a.blue + (b.blue - a.blue) * t,
  );
}

function sanitize(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ASCII_MAP[ch]) out += ASCII_MAP[ch];
    else if (ch.codePointAt(0)! < 128) out += ch;
    else out += "?";
  }
  return out;
}

// ───────────────────────── PDF engine ─────────────────────────

interface TextOpts {
  size?: number;
  bold?: boolean;
  color?: RGB;
}

class Pdf {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  unicode = false;
  y = 0; // linear-mode cursor
  yL = 0; // left column top
  yR = 0; // right column top
  meta: ExportMeta = {};
  brand: Branding = getBranding();
  title = "";
  /** Embedded raster images (drop-in assets or fetched), keyed by concept id. */
  imgMap: Map<string, PDFImage> = new Map();
  /** Per-section resolved diagram: which id, and whether it's a raster image. */
  resolution: Map<Section, { id?: string; image: boolean }> = new Map();

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

  safe = (t: string): string => (this.unicode ? t : sanitize(t));

  w(t: string, size: number, bold = false): number {
    return (bold ? this.bold : this.font).widthOfTextAtSize(this.safe(t), size);
  }

  text(t: string, x: number, baseline: number, o: TextOpts = {}) {
    this.page.drawText(this.safe(t), {
      x,
      y: baseline,
      size: o.size ?? 10,
      font: o.bold ? this.bold : this.font,
      color: o.color ?? INK,
    });
  }

  textC(t: string, cx: number, baseline: number, o: TextOpts = {}) {
    this.text(t, cx - this.w(t, o.size ?? 10, o.bold) / 2, baseline, o);
  }

  wrap(text: string, size: number, width: number, bold = false): string[] {
    const font = bold ? this.bold : this.font;
    const out: string[] = [];
    for (const para of String(text).split("\n")) {
      const words = para.split(/\s+/).filter(Boolean);
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(this.safe(test), size) > width && line) {
          out.push(line);
          line = word;
        } else line = test;
      }
      out.push(line);
    }
    return out.length ? out : [""];
  }

  fit(text: string, size: number, width: number, bold = false): string {
    if (this.w(text, size, bold) <= width) return text;
    let t = this.safe(text);
    const f = bold ? this.bold : this.font;
    while (t.length > 2 && f.widthOfTextAtSize(t + "…", size) > width) t = t.slice(0, -1);
    return t + "…";
  }

  // ---- rounded shapes ----

  fillRound(x: number, y: number, w: number, h: number, r: number, color: RGB, opacity = 1) {
    r = Math.max(0, Math.min(r, h / 2, w / 2));
    this.page.drawRectangle({ x: x + r, y, width: w - 2 * r, height: h, color, opacity });
    this.page.drawRectangle({ x, y: y + r, width: r, height: h - 2 * r, color, opacity });
    this.page.drawRectangle({ x: x + w - r, y: y + r, width: r, height: h - 2 * r, color, opacity });
    const c = (cx: number, cy: number) =>
      this.page.drawCircle({ x: cx, y: cy, size: r, color, opacity });
    c(x + r, y + r);
    c(x + w - r, y + r);
    c(x + r, y + h - r);
    c(x + w - r, y + h - r);
  }

  panel(x: number, y: number, w: number, h: number, r: number, fill: RGB, border?: RGB, bw = 0.9) {
    if (border) {
      this.fillRound(x, y, w, h, r, border);
      this.fillRound(x + bw, y + bw, w - 2 * bw, h - 2 * bw, Math.max(r - bw, 0.5), fill);
    } else {
      this.fillRound(x, y, w, h, r, fill);
    }
  }

  // ───────────────────────── page furniture ─────────────────────────

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.drawHeader();
    this.drawChapterBanner();
    this.drawFooter();
    this.y = CONTENT_TOP;
    this.yL = CONTENT_TOP;
    this.yR = CONTENT_TOP;
  }

  private drawHeader() {
    const y = HEADER_TOP - HEADER_H;
    this.panel(MX, y, CONTENT_W, HEADER_H, 9, NAVY);
    this.panel(MX, y, 5, HEADER_H, 3, AMBER); // accent bar (hidden by round; subtle)
    // logo
    const lcx = MX + 26;
    const lcy = y + HEADER_H / 2;
    this.page.drawCircle({ x: lcx, y: lcy, size: 16, color: WHITE });
    this.page.drawCircle({ x: lcx, y: lcy, size: 16, borderColor: AMBER, borderWidth: 1.5 });
    this.textC(this.brand.monogram, lcx, lcy - 4, { size: 11, bold: true, color: NAVY });
    // wordmark
    const tx = MX + 50;
    this.text(this.brand.name, tx, y + HEADER_H - 17, { size: 14, bold: true, color: WHITE });
    this.text(this.brand.suffix, tx, y + HEADER_H - 29, { size: 10, bold: true, color: AMBER });
    this.text(`"${this.brand.tagline}"`, tx, y + HEADER_H - 39, { size: 7, color: rgb(0.8, 0.83, 0.95) });
    // right: contacts
    const rEdge = MX + CONTENT_W - 12;
    const call = "Call / WhatsApp";
    this.text(call, rEdge - this.w(call, 7), y + HEADER_H - 14, { size: 7, color: rgb(0.8, 0.83, 0.95) });
    const phones = this.brand.phones.join("  ");
    this.text(phones, rEdge - this.w(phones, 9, true), y + HEADER_H - 26, { size: 9, bold: true, color: WHITE });
    this.text(this.brand.website, rEdge - this.w(this.brand.website, 8), y + HEADER_H - 38, { size: 8, color: rgb(0.8, 0.83, 0.95) });
  }

  private drawChapterBanner() {
    const y = CHAP_TOP - CHAP_H;
    // left pill
    const left = (this.meta.className || "CBSE").toUpperCase();
    const lw = this.w(left, 9, true) + 20;
    this.fillRound(MX, y + 2, lw, CHAP_H - 4, (CHAP_H - 4) / 2, NAVY);
    this.text(left, MX + 10, y + CHAP_H / 2 - 3.5, { size: 9, bold: true, color: WHITE });
    // right pill (page x of y drawn in finalize)
    const pw = 78;
    this.fillRound(MX + CONTENT_W - pw, y + 2, pw, CHAP_H - 4, (CHAP_H - 4) / 2, NAVY);
    // center title
    const cLeft = MX + lw + 10;
    const cRight = MX + CONTENT_W - pw - 10;
    const title = this.fit(this.title, 14, cRight - cLeft, true);
    this.textC(title, (cLeft + cRight) / 2, y + CHAP_H / 2 - 4.5, { size: 14, bold: true, color: NAVY });
  }

  private drawFooter() {
    const y = 20;
    const h = FOOTER_TOP - y;
    this.panel(MX, y, CONTENT_W, h, 8, NAVY);
    const lcx = MX + 20;
    const lcy = y + h / 2;
    this.page.drawCircle({ x: lcx, y: lcy, size: 11, color: WHITE });
    this.textC(this.brand.monogram, lcx, lcy - 3, { size: 8, bold: true, color: NAVY });
    const tx = MX + 38;
    this.text(`${this.brand.name} ${this.brand.suffix}`, tx, y + h - 13, { size: 7.5, bold: true, color: WHITE });
    this.text(this.fit(this.brand.address, 6.5, CONTENT_W * 0.55), tx, y + 9, { size: 6.5, color: rgb(0.8, 0.83, 0.95) });
    const rEdge = MX + CONTENT_W - 12;
    const phones = this.brand.phones.join("  ");
    this.text(phones, rEdge - this.w(phones, 7.5, true), y + h - 13, { size: 7.5, bold: true, color: WHITE });
    this.text(this.brand.website, rEdge - this.w(this.brand.website, 7), y + 9, { size: 7, color: rgb(0.8, 0.83, 0.95) });
    // amber tagline strip below
    this.textC(this.brand.footerTagline, PAGE_W / 2, 8, { size: 6.5, color: AMBER_DK });
  }

  /** Draw "Page X of Y" onto every page once the total is known. */
  finalize() {
    const pages = this.doc.getPages();
    const total = pages.length;
    pages.forEach((pg, i) => {
      const label = `Page ${i + 1} of ${total}`;
      const pw = 78;
      const y = CHAP_TOP - CHAP_H;
      const cx = MX + CONTENT_W - pw / 2;
      const tw = this.font.widthOfTextAtSize(this.safe(label), 8.5);
      pg.drawText(this.safe(label), { x: cx - tw / 2, y: y + CHAP_H / 2 - 3, size: 8.5, font: this.bold, color: WHITE });
    });
  }

  // ───────────────────────── linear-mode primitives (paper/deck/full-width) ─────────────────────────

  ensure(h: number) {
    if (this.y - h < CONTENT_BOTTOM) this.newPage();
  }

  flow(text: string, x: number, width: number, o: TextOpts & { gap?: number } = {}) {
    const size = o.size ?? 10.5;
    const lh = size * 1.42;
    for (const line of this.wrap(text, size, width, o.bold)) {
      this.ensure(lh);
      this.text(line, x, this.y - size, { size, bold: o.bold, color: o.color });
      this.y -= lh;
    }
    if (o.gap) this.y -= o.gap;
  }

  bullet(text: string, x = MX, color: RGB = NAVY, width = CONTENT_W) {
    const size = 10.5;
    this.ensure(size * 1.42);
    this.page.drawCircle({ x: x + 3, y: this.y - size + 3.2, size: 1.7, color });
    this.flow(text, x + 12, width - 12 - (x - MX), { size });
  }

  bandTitle(text: string, color: RGB) {
    const h = 22;
    this.ensure(h + 8);
    const y = this.y - h;
    this.fillRound(MX, y, CONTENT_W, h, 5, mix(color, WHITE, 0.86));
    this.page.drawRectangle({ x: MX, y, width: 4, height: h, color });
    this.text(text, MX + 12, y + 7, { size: 12, bold: true, color });
    this.y = y - 10;
  }

  gap(h: number) {
    this.y -= h;
  }
}

// ───────────────────────── card measuring/drawing ─────────────────────────

type Section = Extract<GeneratedContent, { kind: "document" }>["sections"][number];

/** All text of a section, used for semantic diagram matching. */
function sectionText(s: Section): string {
  return `${s.heading} ${(s.body ?? []).join(" ")} ${s.example ?? ""} ${s.diagram ?? ""}`;
}

const PAD = 8;
const B_SIZE = 8.4; // body text size
const B_LH = B_SIZE * 1.4;

function tableColWidths(cols: number, innerW: number): number[] {
  if (cols <= 1) return [innerW];
  const first = innerW * 0.4;
  const rest = (innerW - first) / (cols - 1);
  return [first, ...Array(cols - 1).fill(rest)];
}

function tableHeight(p: Pdf, table: NonNullable<Section["table"]>, innerW: number): number {
  const cols = Math.max(1, table.headers.length);
  const ws = tableColWidths(cols, innerW);
  const rowH = (cells: string[], bold: boolean) => {
    let max = 1;
    cells.forEach((c, i) => (max = Math.max(max, p.wrap(c, 6.8, ws[i] - 6, bold).length)));
    return max * 6.8 * 1.35 + 5;
  };
  let h = rowH(table.headers, true);
  for (const r of table.rows) h += rowH(r, false);
  return h;
}

/** Measure a card's height at COL_W; if `draw`, also render at (x, yTop). */
function card(p: Pdf, s: Section, idx: number, x: number, yTop: number, draw: boolean): number {
  const color = CARD_COLORS[idx % CARD_COLORS.length];
  const innerW = COL_W - PAD * 2;
  // header pill height (title 1-2 lines)
  const titleLines = Math.min(2, p.wrap(s.heading, 8.6, COL_W - 40, true).length);
  const pillH = titleLines > 1 ? 30 : 22;

  // measure body
  let bodyH = PAD;
  const bulletHeights = (s.body ?? []).map((b) => p.wrap(b, B_SIZE, innerW - 10).length * B_LH + 2);
  bodyH += bulletHeights.reduce((a, b) => a + b, 0);
  let exampleH = 0;
  if (s.example) {
    exampleH = p.wrap(`Example: ${s.example}`, B_SIZE, innerW).length * B_LH + 4;
    bodyH += exampleH;
  }
  const kpHeights = (s.keyPoints ?? []).map((k) => p.wrap(k, B_SIZE, innerW - 10).length * B_LH + 2);
  bodyH += kpHeights.reduce((a, b) => a + b, 0);
  let tblH = 0;
  if (s.table && s.table.headers.length) {
    tblH = tableHeight(p, s.table, innerW);
    bodyH += tblH + 4;
  }
  const res = p.resolution.get(s) ?? { image: false };
  const resolvedDiagram = res.id;
  let diagH = 0;
  if (resolvedDiagram || s.diagram) {
    diagH = 74;
    bodyH += diagH + 2;
  }
  bodyH += PAD;
  const total = pillH + bodyH;
  if (!draw) return total;

  // ---- draw ----
  const bodyY = yTop - total;
  // body panel (tint + subtle border)
  p.panel(x, bodyY, COL_W, total - pillH + 6, 7, color.tint, rgb(0.9, 0.9, 0.93), 0.8);
  // header pill
  p.fillRound(x, yTop - pillH, COL_W, pillH, 7, color.head);
  // badge
  const bcx = x + 15;
  const bcy = yTop - pillH / 2;
  p.page.drawCircle({ x: bcx, y: bcy, size: 8.5, color: WHITE });
  p.textC(String(idx + 1), bcx, bcy - 3.2, { size: 8.5, bold: true, color: color.head });
  // title (centered vertically in pill)
  const tLines = p.wrap(s.heading, 8.6, COL_W - 40, true).slice(0, 2);
  let ty = bcy + (tLines.length > 1 ? 4 : -3);
  for (const ln of tLines) {
    p.text(p.fit(ln, 8.6, COL_W - 40, true), x + 28, ty, { size: 8.6, bold: true, color: WHITE });
    ty -= 10;
  }

  // body content
  let cy = yTop - pillH - PAD;
  for (let i = 0; i < (s.body ?? []).length; i++) {
    p.page.drawCircle({ x: x + PAD + 2, y: cy - B_SIZE + 3, size: 1.5, color: color.head });
    for (const ln of p.wrap(s.body[i], B_SIZE, innerW - 10)) {
      p.text(ln, x + PAD + 9, cy - B_SIZE, { size: B_SIZE, color: INK });
      cy -= B_LH;
    }
    cy -= 2;
  }
  for (const k of s.keyPoints ?? []) {
    p.text(p.unicode ? "✓" : ">", x + PAD, cy - B_SIZE, { size: B_SIZE, bold: true, color: GREEN });
    for (const ln of p.wrap(k, B_SIZE, innerW - 10)) {
      p.text(ln, x + PAD + 11, cy - B_SIZE, { size: B_SIZE, color: INK });
      cy -= B_LH;
    }
    cy -= 2;
  }
  if (s.example) {
    const lead = "Example: ";
    const lines = p.wrap(`${lead}${s.example}`, B_SIZE, innerW);
    lines.forEach((ln, i) => {
      if (i === 0) {
        p.text(lead, x + PAD, cy - B_SIZE, { size: B_SIZE, bold: true, color: AMBER_DK });
        p.text(ln.slice(lead.length), x + PAD + p.w(lead, B_SIZE, true), cy - B_SIZE, { size: B_SIZE, color: INK });
      } else {
        p.text(ln, x + PAD, cy - B_SIZE, { size: B_SIZE, color: INK });
      }
      cy -= B_LH;
    });
    cy -= 4;
  }
  if (s.table && s.table.headers.length) {
    cy = drawTable(p, s.table, x + PAD, cy, innerW, color.head) - 4;
  }
  if (resolvedDiagram || s.diagram) {
    const dY = cy - diagH;
    p.panel(x + PAD, dY, innerW, diagH, 5, WHITE, rgb(0.88, 0.9, 0.94), 0.8);
    const boxX = x + PAD + 4;
    const boxY = dY + 10;
    const boxW = innerW - 8;
    const boxH = diagH - 14;
    const png = resolvedDiagram && res.image ? p.imgMap.get(resolvedDiagram) : undefined;
    if (png) {
      // Fit the raster asset inside the box, preserving aspect ratio.
      const scale = Math.min(boxW / png.width, boxH / png.height);
      const dw = png.width * scale;
      const dh = png.height * scale;
      p.page.drawImage(png, { x: boxX + (boxW - dw) / 2, y: boxY + (boxH - dh) / 2, width: dw, height: dh });
    } else {
      const ctx: DiagramCtx = {
        page: p.page,
        font: p.font,
        bold: p.bold,
        ink: INK,
        muted: MUTED,
        accent: color.head,
        safe: p.safe,
      };
      getDiagram(resolvedDiagram)(ctx, boxX, boxY, boxW, boxH);
    }
    if (s.diagram) {
      const cap = p.fit(s.diagram, 6, innerW - 8);
      p.textC(cap, x + PAD + innerW / 2, dY + 2.5, { size: 6, color: MUTED });
    }
    cy = dY - 2;
  }
  return total;
}

function drawTable(p: Pdf, table: NonNullable<Section["table"]>, x: number, yTop: number, innerW: number, head: RGB): number {
  const cols = Math.max(1, table.headers.length);
  const ws = tableColWidths(cols, innerW);
  const xs: number[] = [];
  let acc = x;
  for (const w of ws) {
    xs.push(acc);
    acc += w;
  }
  const rowH = (cells: string[], bold: boolean) => {
    let max = 1;
    cells.forEach((c, i) => (max = Math.max(max, p.wrap(c, 6.8, ws[i] - 6, bold).length)));
    return max * 6.8 * 1.35 + 5;
  };
  let y = yTop;
  // header
  const hH = rowH(table.headers, true);
  p.page.drawRectangle({ x, y: y - hH, width: innerW, height: hH, color: head });
  table.headers.forEach((c, i) => {
    let ly = y - 8;
    for (const ln of p.wrap(c, 6.8, ws[i] - 6, true)) {
      p.text(ln, xs[i] + 3, ly, { size: 6.8, bold: true, color: WHITE });
      ly -= 6.8 * 1.35;
    }
  });
  y -= hH;
  // rows
  table.rows.forEach((r, ri) => {
    const h = rowH(r, false);
    if (ri % 2 === 1) p.page.drawRectangle({ x, y: y - h, width: innerW, height: h, color: rgb(0.97, 0.97, 0.98) });
    r.forEach((c, i) => {
      let ly = y - 8;
      const bold = i === 0;
      for (const ln of p.wrap(c, 6.8, ws[i] - 6, bold)) {
        p.text(ln, xs[i] + 3, ly, { size: 6.8, bold, color: bold ? head : INK });
        ly -= 6.8 * 1.35;
      }
    });
    y -= h;
  });
  // grid lines
  const totalH = yTop - y;
  p.page.drawRectangle({ x, y, width: innerW, height: totalH, borderColor: LINEC, borderWidth: 0.6 });
  for (let i = 1; i < cols; i++)
    p.page.drawLine({ start: { x: xs[i], y }, end: { x: xs[i], y: yTop }, thickness: 0.5, color: LINEC });
  return y;
}

// ───────────────────────── renderers ─────────────────────────

function renderDocument(p: Pdf, c: Extract<GeneratedContent, { kind: "document" }>) {
  // Two-column masonry of section cards.
  p.newPage();
  const place = (s: Section, idx: number) => {
    const h = card(p, s, idx, 0, 0, false);
    // pick the column with more remaining space
    let useLeft = p.yL >= p.yR;
    let colY = useLeft ? p.yL : p.yR;
    if (colY - h < CONTENT_BOTTOM) {
      p.newPage();
      useLeft = true;
      colY = p.yL;
    }
    const x = MX + (useLeft ? 0 : COL_W + GUTTER);
    card(p, s, idx, x, colY, true);
    const nextY = colY - h - 12;
    if (useLeft) p.yL = nextY;
    else p.yR = nextY;
  };
  c.sections.forEach((s, i) => place(s, i));

  // Continue full-width below the lower column.
  p.y = Math.min(p.yL, p.yR) - 6;

  if (c.keyTakeaways?.length) keyTakeawayBox(p, c.keyTakeaways);
  if (c.quote) quoteBox(p, c.quote);
  for (const t of c.tips ?? []) callout(p, "TIP & TRICK", t, "tip");
  for (const m of c.commonMistakes ?? []) callout(p, "COMMON MISTAKE", m, "mistake");
  if (c.pyqs?.length) pyqBlock(p, c.pyqs);
  if (c.summary?.length) summaryBox(p, c.summary);
}

function keyTakeawayBox(p: Pdf, items: string[]) {
  const innerW = CONTENT_W - 24;
  let h = 22;
  for (const it of items) h += p.wrap(it, 9, innerW - 14).length * 12.6 + 3;
  p.ensure(h + 8);
  const y = p.y - h;
  p.panel(MX, y, CONTENT_W, h, 7, YELLOW_TINT, AMBER, 1);
  p.page.drawCircle({ x: MX + 16, y: p.y - 12, size: 4, color: AMBER });
  p.text("KEY TAKEAWAY", MX + 26, p.y - 15, { size: 11, bold: true, color: AMBER_DK });
  p.y -= 26;
  for (const it of items) {
    p.text(p.unicode ? "✓" : ">", MX + 12, p.y - 9, { size: 9, bold: true, color: GREEN });
    p.flow(it, MX + 26, innerW - 14, { size: 9, gap: 3 });
  }
  p.y = y - 10;
}

function quoteBox(p: Pdf, quote: string) {
  const innerW = CONTENT_W - 40;
  const h = p.wrap(`"${quote}"`, 10.5, innerW).length * 15 + 18;
  p.ensure(h + 8);
  const y = p.y - h;
  p.panel(MX, y, CONTENT_W, h, 7, rgb(0.95, 0.96, 1.0), NAVY, 1);
  p.text('"', MX + 14, p.y - 20, { size: 24, bold: true, color: mix(NAVY, WHITE, 0.4) });
  p.y -= 16;
  p.flow(`"${quote}"`, MX + 30, innerW, { size: 10.5, bold: true, color: NAVY_DK });
  p.y = y - 10;
}

function callout(p: Pdf, label: string, body: string, kind: "tip" | "mistake" | "note") {
  const map = {
    tip: { c: GREEN, t: GREEN_TINT },
    mistake: { c: RED, t: RED_TINT },
    note: { c: NAVY, t: rgb(0.93, 0.95, 1) },
  }[kind];
  const padX = 12;
  const innerW = CONTENT_W - padX * 2 - 4;
  const bodyH = p.wrap(body, 10, innerW).length * 14.2;
  const h = 10 + 13 + bodyH + 4;
  p.ensure(h + 6);
  const y = p.y - h;
  p.panel(MX, y, CONTENT_W, h, 6, map.t);
  p.page.drawRectangle({ x: MX, y, width: 4, height: h, color: map.c });
  p.text(label, MX + padX, p.y - 14, { size: 10, bold: true, color: map.c });
  p.y -= 10 + 13;
  p.flow(body, MX + padX, innerW, { size: 10, color: INK });
  p.y = y - 8;
}

function pyqBlock(p: Pdf, items: { question: string; answer?: string; year?: string }[]) {
  p.bandTitle("Previous Year Questions (CBSE)", NAVY);
  items.forEach((q, i) => {
    const innerW = CONTENT_W - 24;
    const qH = p.wrap(`Q${i + 1}. ${q.question}`, 10, innerW - 40, true).length * 14.2;
    const aH = q.answer ? p.wrap(`Ans. ${q.answer}`, 9.5, innerW).length * 13.5 : 0;
    const h = 12 + qH + (aH ? aH + 4 : 0) + 8;
    p.ensure(h + 6);
    const y = p.y - h;
    p.panel(MX, y, CONTENT_W, h, 6, rgb(0.975, 0.977, 0.99), LINEC, 0.8);
    p.page.drawRectangle({ x: MX, y, width: 3, height: h, color: NAVY });
    if (q.year) {
      const w = p.w(q.year, 7.5, true) + 10;
      p.fillRound(PAGE_W - MX - w - 8, p.y - 16, w, 13, 3, rgb(0.93, 0.95, 1));
      p.text(q.year, PAGE_W - MX - w - 3, p.y - 13, { size: 7.5, bold: true, color: NAVY });
    }
    p.y -= 12;
    p.flow(`Q${i + 1}. ${q.question}`, MX + 12, innerW - 40, { size: 10, bold: true });
    if (q.answer) {
      p.gap(2);
      p.flow(`Ans. ${q.answer}`, MX + 12, innerW, { size: 9.5, color: rgb(0.16, 0.45, 0.28) });
    }
    p.y = y - 8;
  });
}

function summaryBox(p: Pdf, items: string[]) {
  p.bandTitle("Chapter Summary", GREEN);
  const padX = 12;
  const innerW = CONTENT_W - padX * 2 - 12;
  let h = 12;
  for (const it of items) h += p.wrap(it, 10, innerW).length * 14.2 + 5;
  p.ensure(h + 6);
  const y = p.y - h;
  p.panel(MX, y, CONTENT_W, h, 6, GREEN_TINT, GREEN, 1);
  p.y -= 10;
  for (const it of items) {
    p.page.drawCircle({ x: MX + padX + 2, y: p.y - 7, size: 1.8, color: GREEN });
    p.flow(it, MX + padX + 12, innerW, { size: 10, gap: 3 });
  }
  p.y = Math.min(p.y, y) - 8;
}

function renderPaper(p: Pdf, c: Extract<GeneratedContent, { kind: "paper" }>) {
  p.newPage();
  p.bandTitle("Question Paper", NAVY);
  const meta: string[] = [];
  if (c.totalMarks) meta.push(`Maximum Marks: ${c.totalMarks}`);
  if (c.durationMin) meta.push(`Time Allowed: ${c.durationMin} min`);
  if (meta.length) p.flow(meta.join("          "), MX, CONTENT_W, { size: 11, bold: true, color: NAVY, gap: 6 });
  if (c.instructions?.length)
    callout(p, "GENERAL INSTRUCTIONS", c.instructions.map((i) => `• ${i}`).join("\n"), "note");

  c.questions.forEach((q) => {
    const marks = `[${q.marks} mark${q.marks === 1 ? "" : "s"}]`;
    const head = `Q${q.number}.  ${q.text}`;
    p.ensure(p.wrap(head, 10.5, CONTENT_W - 60, true).length * 14.9 + 16);
    const yStart = p.y;
    const w = p.w(marks, 8, true) + 10;
    p.fillRound(PAGE_W - MX - w, yStart - 13, w, 13, 3, rgb(0.93, 0.95, 1));
    p.text(marks, PAGE_W - MX - w + 5, yStart - 10, { size: 8, bold: true, color: NAVY });
    p.flow(head, MX, CONTENT_W - w - 8, { size: 10.5, bold: true });
    for (let i = 0; i < (q.options?.length ?? 0); i++)
      p.flow(`(${String.fromCharCode(97 + i)})  ${q.options![i]}`, MX + 16, CONTENT_W - 16, { size: 10 });
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
  p.newPage();
  c.slides.forEach((s, i) => {
    p.bandTitle(`${i + 1}. ${s.title}`, CARD_COLORS[i % CARD_COLORS.length].head);
    for (const b of s.bullets ?? []) p.bullet(b);
    if (s.notes) callout(p, "SPEAKER NOTES", s.notes, "note");
    p.gap(6);
  });
}

export async function renderPdf(content: GeneratedContent, meta: ExportMeta = {}): Promise<Buffer> {
  const p = new Pdf();
  p.meta = meta;
  // The chapter banner reads best with just the chapter name; fall back to the
  // content title when no chapter was provided.
  p.title = meta.chapter || content.title;
  await p.init();

  // Hybrid image resolution (async pre-pass, before the sync card layout):
  //   1. detect the concept for each section (AI id or semantic match),
  //   2. if a built-in vector exists, use it (a drop-in PNG asset can override),
  //   3. otherwise try the cache, then — only if IMAGE_FETCH_ENABLED — an online
  //      educational image (cached for reuse),
  //   4. if nothing is available, the section stays text-only.
  // Every step is guarded so the export always succeeds offline.
  if (content.kind === "document") {
    const embed = async (buf: Buffer, mime: string): Promise<PDFImage | null> => {
      try {
        return mime === "image/jpeg" ? await p.doc.embedJpg(buf) : await p.doc.embedPng(buf);
      } catch {
        return null;
      }
    };
    for (const s of content.sections) {
      const c = matchConcept(sectionText(s), s.diagramId);
      if (!c) {
        p.resolution.set(s, { image: false });
        continue;
      }
      // A cached image (admin upload/override or a prior fetch) wins over the
      // built-in vector. For vector concepts we don't fetch; for the rest we do.
      const got = await acquireImage(c.id, c.query, { allowFetch: !c.hasVector });
      let img = got ? await embed(got.buf, got.mime) : null;
      if (!img && c.hasVector) {
        const override = readPngAsset(c.id);
        if (override) img = await embed(override, "image/png");
      }
      if (img) {
        p.imgMap.set(c.id, img);
        p.resolution.set(s, { id: c.id, image: true });
      } else if (c.hasVector) {
        p.resolution.set(s, { id: c.id, image: false });
      } else {
        p.resolution.set(s, { image: false });
      }
    }
  }

  if (content.kind === "document") renderDocument(p, content);
  else if (content.kind === "paper") renderPaper(p, content);
  else renderDeck(p, content);

  p.finalize();
  return Buffer.from(await p.doc.save());
}
