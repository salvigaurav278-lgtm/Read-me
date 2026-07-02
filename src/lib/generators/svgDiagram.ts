// Render the built-in vector diagrams as inline SVG for the web preview, by
// running the SAME diagram functions against a pdf-lib-compatible page stub.
// This keeps one source of truth for diagrams across PDF export and the app UI.

import { rgb } from "pdf-lib";
import { getDiagram, hasDiagramVector, type DiagramCtx } from "./diagrams";

type RGBLike = { red: number; green: number; blue: number };

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Minimal SVG-emitting stand-in for a pdf-lib PDFPage (y-up → y-down). */
class SvgPage {
  parts: string[] = [];
  constructor(public W: number, public H: number) {}
  private col(c?: RGBLike): string {
    if (!c) return "none";
    return `rgb(${Math.round(c.red * 255)},${Math.round(c.green * 255)},${Math.round(c.blue * 255)})`;
  }
  private fy(y: number): number {
    return this.H - y;
  }
  drawLine(o: { start: { x: number; y: number }; end: { x: number; y: number }; thickness?: number; color?: RGBLike }) {
    this.parts.push(
      `<line x1="${o.start.x}" y1="${this.fy(o.start.y)}" x2="${o.end.x}" y2="${this.fy(o.end.y)}" stroke="${this.col(o.color)}" stroke-width="${o.thickness ?? 1}" stroke-linecap="round"/>`,
    );
  }
  drawCircle(o: { x: number; y: number; size: number; color?: RGBLike; borderColor?: RGBLike; borderWidth?: number; opacity?: number }) {
    const stroke = o.borderColor ? ` stroke="${this.col(o.borderColor)}" stroke-width="${o.borderWidth ?? 1}"` : "";
    this.parts.push(`<circle cx="${o.x}" cy="${this.fy(o.y)}" r="${o.size}" fill="${o.color ? this.col(o.color) : "none"}"${stroke} opacity="${o.opacity ?? 1}"/>`);
  }
  drawEllipse(o: { x: number; y: number; xScale: number; yScale: number; color?: RGBLike; borderColor?: RGBLike; borderWidth?: number; opacity?: number }) {
    const stroke = o.borderColor ? ` stroke="${this.col(o.borderColor)}" stroke-width="${o.borderWidth ?? 1}"` : "";
    this.parts.push(`<ellipse cx="${o.x}" cy="${this.fy(o.y)}" rx="${o.xScale}" ry="${o.yScale}" fill="${o.color ? this.col(o.color) : "none"}"${stroke} opacity="${o.opacity ?? 1}"/>`);
  }
  drawRectangle(o: { x: number; y: number; width: number; height: number; color?: RGBLike; borderColor?: RGBLike; borderWidth?: number; opacity?: number }) {
    const stroke = o.borderColor ? ` stroke="${this.col(o.borderColor)}" stroke-width="${o.borderWidth ?? 1}"` : "";
    this.parts.push(`<rect x="${o.x}" y="${this.fy(o.y + o.height)}" width="${o.width}" height="${o.height}" fill="${o.color ? this.col(o.color) : "none"}"${stroke} opacity="${o.opacity ?? 1}"/>`);
  }
  drawText(text: string, o: { x: number; y: number; size?: number; color?: RGBLike; font?: { bold?: boolean } }) {
    const weight = o.font?.bold ? ' font-weight="bold"' : "";
    this.parts.push(
      `<text x="${o.x}" y="${this.fy(o.y)}" font-size="${o.size ?? 10}" fill="${this.col(o.color)}" font-family="Helvetica, Arial, sans-serif"${weight}>${esc(text)}</text>`,
    );
  }
  svg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.W} ${this.H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">${this.parts.join("")}</svg>`;
  }
}

// A light font stub so diagram text-centering (widthOfTextAtSize) works.
function fontStub(bold: boolean) {
  return { bold, widthOfTextAtSize: (t: string, size: number) => t.length * size * 0.5 };
}

/** True if this concept has a built-in vector we can draw as SVG. */
export function canRenderSvg(id: string): boolean {
  return hasDiagramVector(id);
}

/** Render a concept's built-in vector diagram as an SVG string. */
export function renderDiagramSvg(id: string, width = 260, height = 150): string {
  const page = new SvgPage(width, height);
  const ctx = {
    page: page as unknown as DiagramCtx["page"],
    font: fontStub(false) as unknown as DiagramCtx["font"],
    bold: fontStub(true) as unknown as DiagramCtx["bold"],
    ink: rgb(0.13, 0.15, 0.2),
    muted: rgb(0.46, 0.48, 0.55),
    accent: rgb(0.08, 0.12, 0.35),
    safe: (t: string) => t,
  } as DiagramCtx;
  getDiagram(id)(ctx, 8, 8, width - 16, height - 16);
  return page.svg();
}
