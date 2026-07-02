// Vector science-diagram library for the premium PDF export.
//
// Each diagram is drawn with pdf-lib primitives (no external images), so the
// export works fully offline and stays crisp at any zoom. A section in the
// generated content can reference one of these by id (`diagramId`); the PDF
// renderer looks it up here and draws it inside the section card. Unknown ids
// fall back to `generic`.

import { rgb, type PDFPage, type PDFFont, type RGB } from "pdf-lib";

export interface DiagramCtx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  ink: RGB;
  muted: RGB;
  accent: RGB;
  /** Draw ASCII-safe or unicode label text. */
  safe: (t: string) => string;
}

/** Draw signature: box is bottom-left (x,y) with width w, height h. */
type Draw = (ctx: DiagramCtx, x: number, y: number, w: number, h: number) => void;

// palette shared across diagrams
const GLASS = rgb(0.42, 0.47, 0.56);
const LIQUID = rgb(0.56, 0.79, 0.96);
const LIQUID_DEEP = rgb(0.28, 0.58, 0.9);
const SAND = rgb(0.78, 0.63, 0.42);
const FLAME = rgb(0.96, 0.55, 0.12);
const FLAME_IN = rgb(0.98, 0.8, 0.2);
const METAL = rgb(0.5, 0.55, 0.62);
const RED = rgb(0.85, 0.25, 0.25);
const GREEN = rgb(0.14, 0.55, 0.34);

function label(
  ctx: DiagramCtx,
  text: string,
  cx: number,
  y: number,
  size = 6,
  color?: RGB,
) {
  const w = ctx.font.widthOfTextAtSize(ctx.safe(text), size);
  ctx.page.drawText(ctx.safe(text), {
    x: cx - w / 2,
    y,
    size,
    font: ctx.font,
    color: color ?? ctx.muted,
  });
}

function line(ctx: DiagramCtx, x1: number, y1: number, x2: number, y2: number, c = GLASS, t = 1) {
  ctx.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color: c });
}

/** A simple beaker centered at cx with its base at baseY. */
function beaker(ctx: DiagramCtx, cx: number, baseY: number, w: number, h: number, fill = 0.45, liquid = LIQUID) {
  const l = cx - w / 2;
  const r = cx + w / 2;
  if (fill > 0) ctx.page.drawRectangle({ x: l + 1, y: baseY + 1, width: w - 2, height: (h - 2) * fill, color: liquid });
  line(ctx, l, baseY + h, l, baseY, GLASS, 1.2);
  line(ctx, r, baseY + h, r, baseY, GLASS, 1.2);
  line(ctx, l, baseY, r, baseY, GLASS, 1.2);
  // spout hint
  line(ctx, l, baseY + h, l - 2.5, baseY + h - 2.5, GLASS, 1.2);
}

function flame(ctx: DiagramCtx, cx: number, baseY: number) {
  ctx.page.drawEllipse({ x: cx, y: baseY + 4, xScale: 3.2, yScale: 5.5, color: FLAME });
  ctx.page.drawEllipse({ x: cx, y: baseY + 3, xScale: 1.6, yScale: 3.2, color: FLAME_IN });
}

function tripod(ctx: DiagramCtx, cx: number, topY: number, w: number, legH: number) {
  line(ctx, cx - w / 2, topY, cx + w / 2, topY, METAL, 1.2);
  line(ctx, cx - w / 2 + 3, topY, cx - w / 2 + 1, topY - legH, METAL, 1.2);
  line(ctx, cx + w / 2 - 3, topY, cx + w / 2 - 1, topY - legH, METAL, 1.2);
}

function arrow(ctx: DiagramCtx, x1: number, y: number, x2: number, c = METAL) {
  line(ctx, x1, y, x2, y, c, 1.2);
  const d = x2 > x1 ? -1 : 1;
  line(ctx, x2, y, x2 + d * 3, y + 2.2, c, 1.2);
  line(ctx, x2, y, x2 + d * 3, y - 2.2, c, 1.2);
}

/** Arrow between two arbitrary points (with arrowhead at x2,y2). */
function vec(ctx: DiagramCtx, x1: number, y1: number, x2: number, y2: number, c = METAL, t = 1) {
  line(ctx, x1, y1, x2, y2, c, t);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const ah = 3.4;
  line(ctx, x2, y2, x2 - ah * Math.cos(a - 0.42), y2 - ah * Math.sin(a - 0.42), c, t);
  line(ctx, x2, y2, x2 - ah * Math.cos(a + 0.42), y2 - ah * Math.sin(a + 0.42), c, t);
}

/** A point charge: filled circle with a white +/- sign. */
function charge(ctx: DiagramCtx, cx: number, cy: number, positive: boolean, r = 6) {
  const col = positive ? RED : rgb(0.2, 0.42, 0.86);
  ctx.page.drawCircle({ x: cx, y: cy, size: r, color: col });
  const s = positive ? "+" : "-";
  const sz = r * 1.7;
  const w = ctx.bold.widthOfTextAtSize(s, sz);
  ctx.page.drawText(s, { x: cx - w / 2, y: cy - sz * 0.34, size: sz, font: ctx.bold, color: rgb(1, 1, 1) });
}

// ───────────────────────── diagrams ─────────────────────────

const filtration: Draw = (ctx, x, y, w, h) => {
  const cx = x + w * 0.42;
  const topY = y + h - 8;
  // funnel (inverted triangle) into a beaker
  const fw = Math.min(46, w * 0.5);
  const fy = topY;
  line(ctx, cx - fw / 2, fy, cx + fw / 2, fy, GLASS, 1.2);
  line(ctx, cx - fw / 2, fy, cx, fy - 20, GLASS, 1.2);
  line(ctx, cx + fw / 2, fy, cx, fy - 20, GLASS, 1.2);
  // filter paper (inner cone, dashed-ish lighter)
  line(ctx, cx - fw / 2 + 4, fy - 1.5, cx, fy - 17, rgb(0.7, 0.72, 0.78), 0.8);
  line(ctx, cx + fw / 2 - 4, fy - 1.5, cx, fy - 17, rgb(0.7, 0.72, 0.78), 0.8);
  // residue in cone
  ctx.page.drawEllipse({ x: cx, y: fy - 6, xScale: fw / 2 - 5, yScale: 3, color: SAND });
  // stem
  line(ctx, cx, fy - 20, cx, fy - 30, GLASS, 1.2);
  // drip
  ctx.page.drawCircle({ x: cx, y: fy - 34, size: 1.1, color: LIQUID_DEEP });
  // beaker with filtrate
  beaker(ctx, cx, y + 6, 34, 22, 0.5, LIQUID);
  label(ctx, "Filter paper", x + w * 0.82, fy - 6, 6);
  label(ctx, "Filtrate", cx, y, 6);
};

const evaporation: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const dishY = y + h * 0.5;
  // evaporating dish (shallow bowl)
  ctx.page.drawEllipse({ x: cx, y: dishY, xScale: 22, yScale: 4.5, borderColor: GLASS, borderWidth: 1.2 });
  ctx.page.drawRectangle({ x: cx - 20, y: dishY - 3, width: 40, height: 3, color: LIQUID });
  // vapour
  for (let i = -1; i <= 1; i++) {
    line(ctx, cx + i * 8, dishY + 6, cx + i * 8 + 3, dishY + 16, rgb(0.7, 0.76, 0.85), 0.8);
    line(ctx, cx + i * 8 + 3, dishY + 16, cx + i * 8, dishY + 24, rgb(0.7, 0.76, 0.85), 0.8);
  }
  tripod(ctx, cx, dishY - 5, 46, 18);
  flame(ctx, cx, dishY - 24);
  label(ctx, "Heat", cx, y + 2, 6);
};

const crystallisation: Draw = (ctx, x, y, w, h) => {
  const baseY = y + h * 0.4;
  const positions = [x + w * 0.2, x + w * 0.5, x + w * 0.8];
  positions.forEach((cx, i) => {
    beaker(ctx, cx, baseY, 26, 22, 0.5, LIQUID);
    if (i === 2) {
      // crystals settled
      for (let k = 0; k < 5; k++)
        ctx.page.drawRectangle({ x: cx - 8 + k * 3.4, y: baseY + 2, width: 2.4, height: 2.4, color: LIQUID_DEEP });
    }
    if (i < 2) arrow(ctx, cx + 15, baseY + 10, positions[i + 1] - 15);
  });
  label(ctx, "Hot solution", positions[0], y + 4, 5.5);
  label(ctx, "Cool", positions[1], y + 4, 5.5);
  label(ctx, "Crystals", positions[2], y + 4, 5.5);
};

const sublimation: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const dishY = y + h * 0.42;
  // inverted funnel capturing vapour
  line(ctx, cx - 16, dishY + 26, cx + 16, dishY + 26, GLASS, 1.2);
  line(ctx, cx - 16, dishY + 26, cx, dishY + 8, GLASS, 1.2);
  line(ctx, cx + 16, dishY + 26, cx, dishY + 8, GLASS, 1.2);
  line(ctx, cx, dishY + 8, cx, dishY + 34, GLASS, 1.2); // stem up
  // deposited crystals under funnel
  for (let i = -1; i <= 1; i++)
    ctx.page.drawCircle({ x: cx + i * 5, y: dishY + 18, size: 1.2, color: rgb(0.6, 0.5, 0.75) });
  // dish + tripod + flame
  ctx.page.drawEllipse({ x: cx, y: dishY, xScale: 20, yScale: 4, borderColor: GLASS, borderWidth: 1.2 });
  ctx.page.drawRectangle({ x: cx - 18, y: dishY - 3, width: 36, height: 3, color: SAND });
  tripod(ctx, cx, dishY - 5, 44, 16);
  flame(ctx, cx, dishY - 22);
  label(ctx, "Crystals", cx + 26, dishY + 16, 5.5);
};

const magnetSeparation: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  // horseshoe magnet on the left
  const mx = x + w * 0.24;
  ctx.page.drawRectangle({ x: mx - 10, y: cy - 4, width: 6, height: 18, color: RED });
  ctx.page.drawRectangle({ x: mx + 4, y: cy - 4, width: 6, height: 18, color: rgb(0.35, 0.4, 0.5) });
  line(ctx, mx - 7, cy - 4, mx + 7, cy - 4, rgb(0.35, 0.4, 0.5), 4);
  // filings attracted (dots flying toward magnet)
  for (let i = 0; i < 7; i++) {
    const px = mx + 16 + i * 5;
    ctx.page.drawCircle({ x: px, y: cy + 10 - (i % 3) * 4, size: 1.1, color: ctx.ink });
  }
  arrow(ctx, x + w * 0.62, cy + 6, mx + 14);
  // remaining pile on the right
  ctx.page.drawEllipse({ x: x + w * 0.8, y: y + h * 0.32, xScale: 14, yScale: 4, color: SAND });
  label(ctx, "Magnet", mx, y + 2, 6, RED);
  label(ctx, "Non-magnetic", x + w * 0.8, y + h * 0.32 - 8, 5.5);
};

const separatingFunnel: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const topY = y + h - 8;
  // pear-shaped funnel: circle top, taper to stopcock
  ctx.page.drawEllipse({ x: cx, y: topY - 16, xScale: 15, yScale: 16, borderColor: GLASS, borderWidth: 1.2 });
  // two liquid layers
  ctx.page.drawEllipse({ x: cx, y: topY - 21, xScale: 13, yScale: 9, color: rgb(0.95, 0.85, 0.5) }); // oil
  ctx.page.drawEllipse({ x: cx, y: topY - 24, xScale: 13, yScale: 5, color: LIQUID }); // water
  // stem + stopcock
  line(ctx, cx, topY - 31, cx, topY - 40, GLASS, 1.2);
  ctx.page.drawCircle({ x: cx, y: topY - 36, size: 2.2, color: RED });
  // beaker below
  beaker(ctx, cx, y + 4, 26, 14, 0.4, LIQUID);
  label(ctx, "Lighter liquid", x + w * 0.86, topY - 20, 5.5);
  label(ctx, "Denser liquid", x + w * 0.86, topY - 27, 5.5);
};

const molecularPureMixture: Draw = (ctx, x, y, w, h) => {
  const cyc = y + h * 0.62;
  const drawCluster = (cx: number, kinds: RGB[]) => {
    const pts = [
      [0, 0], [8, 4], [-8, 4], [4, -7], [-4, -7], [12, -3], [-12, -3],
    ];
    pts.forEach((p, i) => {
      ctx.page.drawCircle({ x: cx + p[0], y: cyc + p[1], size: 3.4, color: kinds[i % kinds.length] });
    });
  };
  const pure = rgb(0.28, 0.5, 0.9);
  drawCluster(x + w * 0.27, [pure]);
  drawCluster(x + w * 0.73, [pure, rgb(0.3, 0.7, 0.45), rgb(0.9, 0.55, 0.2)]);
  label(ctx, "Pure substance", x + w * 0.27, y + 6, 6);
  label(ctx, "Mixture", x + w * 0.73, y + 6, 6);
};

const beakerSolution: Draw = (ctx, x, y, w, h) => {
  const cx = x + w * 0.42;
  beaker(ctx, cx, y + 8, 48, h * 0.6, 0.7, LIQUID);
  // solute dots dissolved
  for (let i = 0; i < 6; i++)
    ctx.page.drawCircle({ x: cx - 16 + (i % 3) * 12, y: y + 14 + Math.floor(i / 3) * 10, size: 1, color: LIQUID_DEEP });
  arrow(ctx, x + w * 0.76, y + h * 0.62, cx + 22);
  arrow(ctx, x + w * 0.76, y + h * 0.34, cx + 22);
  label(ctx, "Solvent", x + w * 0.9, y + h * 0.62 - 2, 6);
  label(ctx, "Solute", x + w * 0.9, y + h * 0.34 - 2, 6);
};

const testTubes: Draw = (ctx, x, y, w, h) => {
  const baseY = y + h * 0.3;
  const tube = (cx: number, liquid: RGB) => {
    line(ctx, cx - 5, baseY + 30, cx - 5, baseY + 4, GLASS, 1.2);
    line(ctx, cx + 5, baseY + 30, cx + 5, baseY + 4, GLASS, 1.2);
    ctx.page.drawEllipse({ x: cx, y: baseY + 4, xScale: 5, yScale: 3, borderColor: GLASS, borderWidth: 1.2 });
    ctx.page.drawRectangle({ x: cx - 4.2, y: baseY + 4, width: 8.4, height: 14, color: liquid });
  };
  tube(x + w * 0.24, LIQUID);
  label(ctx, "+", x + w * 0.42, baseY + 12, 12, ctx.ink);
  tube(x + w * 0.55, rgb(0.7, 0.85, 0.6));
  arrow(ctx, x + w * 0.68, baseY + 12, x + w * 0.8);
  tube(x + w * 0.9, rgb(0.95, 0.95, 0.98));
  label(ctx, "Precipitate", x + w / 2, y + 2, 5.5);
};

const distillation: Draw = (ctx, x, y, w, h) => {
  const fx = x + w * 0.24;
  const fy = y + h * 0.34;
  // round-bottom flask
  ctx.page.drawEllipse({ x: fx, y: fy, xScale: 13, yScale: 12, borderColor: GLASS, borderWidth: 1.2 });
  ctx.page.drawEllipse({ x: fx, y: fy - 3, xScale: 11, yScale: 8, color: LIQUID });
  line(ctx, fx - 3, fy + 12, fx - 3, fy + 22, GLASS, 1.2);
  line(ctx, fx + 3, fy + 12, fx + 3, fy + 22, GLASS, 1.2);
  // delivery tube to condenser
  line(ctx, fx + 3, fy + 22, x + w * 0.62, fy + 22, GLASS, 1.2);
  line(ctx, x + w * 0.62, fy + 22, x + w * 0.62, y + h * 0.5, GLASS, 1.2);
  // collecting beaker
  beaker(ctx, x + w * 0.62, y + 6, 24, 16, 0.4, LIQUID);
  tripod(ctx, fx, fy - 12, 26, 12);
  flame(ctx, fx, fy - 26);
  label(ctx, "Distillate", x + w * 0.62, y + 1, 6);
};

const generic: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  // conical flask
  const top = cy + 16;
  line(ctx, cx - 4, top, cx - 4, top - 6, GLASS, 1.2);
  line(ctx, cx + 4, top, cx + 4, top - 6, GLASS, 1.2);
  line(ctx, cx - 4, top - 6, cx - 16, cy - 16, GLASS, 1.2);
  line(ctx, cx + 4, top - 6, cx + 16, cy - 16, GLASS, 1.2);
  line(ctx, cx - 16, cy - 16, cx + 16, cy - 16, GLASS, 1.2);
  // liquid
  ctx.page.drawRectangle({ x: cx - 12, y: cy - 15, width: 24, height: 8, color: LIQUID });
  // bubbles
  for (let i = 0; i < 4; i++)
    ctx.page.drawCircle({ x: cx - 6 + i * 4, y: cy - 6 + (i % 2) * 4, size: 1, color: LIQUID_DEEP });
  label(ctx, "Illustration", cx, y + 2, 6);
};

// ───────────────────────── physics ─────────────────────────

const fieldLinesPositive: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.min(w, h) / 2 - 6;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    vec(ctx, cx + 7 * Math.cos(a), cy + 7 * Math.sin(a), cx + R * Math.cos(a), cy + R * Math.sin(a), rgb(0.5, 0.55, 0.72), 0.8);
  }
  charge(ctx, cx, cy, true, 7);
  label(ctx, "Field lines of a +q charge", cx, y + 1, 5.5);
};

const fieldLinesNegative: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.min(w, h) / 2 - 6;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    vec(ctx, cx + R * Math.cos(a), cy + R * Math.sin(a), cx + 9 * Math.cos(a), cy + 9 * Math.sin(a), rgb(0.5, 0.55, 0.72), 0.8);
  }
  charge(ctx, cx, cy, false, 7);
  label(ctx, "Field lines into a -q charge", cx, y + 1, 5.5);
};

const electricDipole: Draw = (ctx, x, y, w, h) => {
  const cy = y + h * 0.58;
  const nx = x + w * 0.34;
  const px = x + w * 0.66;
  line(ctx, nx, cy, px, cy, ctx.muted, 0.8);
  charge(ctx, nx, cy, false, 6);
  charge(ctx, px, cy, true, 6);
  vec(ctx, nx, cy - 12, px, cy - 12, rgb(0.45, 0.28, 0.68), 1.2); // dipole moment p
  label(ctx, "p", (nx + px) / 2, cy - 22, 7, rgb(0.45, 0.28, 0.68));
  label(ctx, "2a", (nx + px) / 2, cy + 8, 6);
};

const coulombForce: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const q1 = x + w * 0.28;
  const q2 = x + w * 0.72;
  charge(ctx, q1, cy, true, 6);
  charge(ctx, q2, cy, true, 6);
  vec(ctx, q1 - 4, cy, q1 - 22, cy, RED, 1.2); // force on q1 (repulsion)
  vec(ctx, q2 + 4, cy, q2 + 22, cy, RED, 1.2); // force on q2
  line(ctx, q1, cy - 12, q2, cy - 12, ctx.muted, 0.6);
  label(ctx, "r", (q1 + q2) / 2, cy - 22, 6);
  label(ctx, "F", q1 - 14, cy + 4, 6, RED);
  label(ctx, "F", q2 + 14, cy + 4, 6, RED);
};

const dipoleInField: Draw = (ctx, x, y, w, h) => {
  // uniform field: vertical up arrows
  for (let i = 0; i < 4; i++) {
    const fx = x + 8 + i * ((w - 16) / 3);
    vec(ctx, fx, y + 6, fx, y + h - 6, rgb(0.62, 0.68, 0.82), 0.7);
  }
  // dipole at an angle through the centre
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ang = Math.PI / 5;
  const L = Math.min(w, h) * 0.3;
  const px = cx + L * Math.cos(ang);
  const py = cy + L * Math.sin(ang);
  const nx = cx - L * Math.cos(ang);
  const ny = cy - L * Math.sin(ang);
  line(ctx, nx, ny, px, py, ctx.muted, 1);
  charge(ctx, px, py, true, 5.5);
  charge(ctx, nx, ny, false, 5.5);
  label(ctx, "torque aligns dipole with E", cx, y + 1, 5.5);
};

const chargingInduction: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  // charged rod on the left (positive)
  ctx.page.drawRectangle({ x: x + 6, y: cy - 3, width: 26, height: 6, color: rgb(0.85, 0.5, 0.2) });
  for (let i = 0; i < 3; i++) label(ctx, "+", x + 11 + i * 8, cy - 2.5, 6, RED);
  // neutral conducting sphere on the right, polarised
  const scx = x + w * 0.68;
  ctx.page.drawCircle({ x: scx, y: cy, size: 16, borderColor: METAL, borderWidth: 1.2 });
  for (let i = -1; i <= 1; i++) label(ctx, "-", scx - 12, cy + i * 6, 7, rgb(0.2, 0.42, 0.86));
  for (let i = -1; i <= 1; i++) label(ctx, "+", scx + 11, cy + i * 6, 6, RED);
  label(ctx, "Induced charges", scx, y + 1, 5.5);
};

const gaussianSurface: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.min(w, h) / 2 - 8;
  // dashed sphere
  const seg = 28;
  for (let i = 0; i < seg; i += 2) {
    const a1 = (i / seg) * 2 * Math.PI;
    const a2 = ((i + 1) / seg) * 2 * Math.PI;
    line(ctx, cx + R * Math.cos(a1), cy + R * Math.sin(a1), cx + R * Math.cos(a2), cy + R * Math.sin(a2), rgb(0.5, 0.55, 0.72), 0.9);
  }
  // flux arrows outward
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    vec(ctx, cx + R * Math.cos(a), cy + R * Math.sin(a), cx + (R + 8) * Math.cos(a), cy + (R + 8) * Math.sin(a), rgb(0.14, 0.55, 0.34), 0.9);
  }
  charge(ctx, cx, cy, true, 6);
  label(ctx, "Gaussian surface", cx, y + 1, 5.5);
};

const uniformField: Draw = (ctx, x, y, w, h) => {
  for (let i = 0; i < 5; i++) {
    const fy = y + 8 + i * ((h - 16) / 4);
    vec(ctx, x + 8, fy, x + w - 8, fy, rgb(0.16, 0.35, 0.74), 0.9);
  }
  label(ctx, "Uniform electric field", x + w / 2, y + 1, 5.5);
};

// ───────────────────────── cross-subject ─────────────────────────

const xyGraph: Draw = (ctx, x, y, w, h) => {
  const ox = x + 14;
  const oy = y + 12;
  vec(ctx, ox, oy, ox, y + h - 6, ctx.ink, 1); // y-axis
  vec(ctx, ox, oy, x + w - 6, oy, ctx.ink, 1); // x-axis
  // decaying curve (like 1/r^2)
  let px = ox + 4;
  let py = y + h - 10;
  for (let i = 1; i <= 20; i++) {
    const nx = ox + 4 + i * ((w - 24) / 20);
    const ny = oy + 4 + (y + h - 14 - oy) / (1 + i * 0.5);
    line(ctx, px, py, nx, ny, rgb(0.16, 0.35, 0.74), 1.3);
    px = nx;
    py = ny;
  }
  label(ctx, "x", x + w - 6, oy - 7, 6);
  label(ctx, "y", ox - 6, y + h - 8, 6);
};

const rayDiagramLens: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  line(ctx, x + 6, cy, x + w - 6, cy, ctx.muted, 0.7); // principal axis
  ctx.page.drawEllipse({ x: cx, y: cy, xScale: 5, yScale: Math.min(h, w) * 0.32, borderColor: rgb(0.16, 0.35, 0.74), borderWidth: 1.2 });
  // object arrow
  vec(ctx, x + w * 0.2, cy, x + w * 0.2, cy + 14, GREEN, 1.2);
  // rays
  line(ctx, x + w * 0.2, cy + 14, cx, cy + 14, rgb(0.85, 0.4, 0.2), 0.9);
  line(ctx, cx, cy + 14, x + w * 0.82, cy - 12, rgb(0.85, 0.4, 0.2), 0.9);
  line(ctx, x + w * 0.2, cy + 14, x + w * 0.82, cy - 12, rgb(0.85, 0.4, 0.2), 0.9);
  vec(ctx, x + w * 0.82, cy, x + w * 0.82, cy - 12, rgb(0.45, 0.28, 0.68), 1.2); // image
  label(ctx, "Object", x + w * 0.2, y + 1, 5.5);
  label(ctx, "Image", x + w * 0.82, y + 1, 5.5);
};

const circuitSimple: Draw = (ctx, x, y, w, h) => {
  const l = x + 12, r = x + w - 12, t = y + h - 12, b = y + 12;
  line(ctx, l, b, l, t, ctx.ink, 1.1);
  line(ctx, l, t, r, t, ctx.ink, 1.1);
  line(ctx, r, t, r, b, ctx.ink, 1.1);
  line(ctx, l, b, r, b, ctx.ink, 1.1);
  // battery (top)
  const bx = (l + r) / 2;
  ctx.page.drawRectangle({ x: bx - 6, y: t - 2, width: 12, height: 4, color: rgb(1, 1, 1) });
  line(ctx, bx - 4, t - 4, bx - 4, t + 4, ctx.ink, 1.4);
  line(ctx, bx + 4, t - 2, bx + 4, t + 2, ctx.ink, 2.4);
  // resistor (right side, zigzag)
  let zy = t - 6;
  for (let i = 0; i < 5; i++) {
    line(ctx, r + (i % 2 ? 4 : -4), zy, r + (i % 2 ? -4 : 4), zy - 5, rgb(0.85, 0.4, 0.2), 1.2);
    zy -= 5;
  }
  // bulb (bottom)
  ctx.page.drawCircle({ x: bx, y: b, size: 5, borderColor: rgb(0.92, 0.62, 0.12), borderWidth: 1.1 });
  label(ctx, "Simple circuit", x + w / 2, y + 1, 5.5);
};

const rightTriangle: Draw = (ctx, x, y, w, h) => {
  const ax = x + 14, ay = y + 12;
  const bx = x + w - 14, by = y + 12;
  const cx = ax, cy = y + h - 10;
  line(ctx, ax, ay, bx, by, rgb(0.16, 0.35, 0.74), 1.3);
  line(ctx, bx, by, cx, cy, rgb(0.16, 0.35, 0.74), 1.3);
  line(ctx, cx, cy, ax, ay, rgb(0.16, 0.35, 0.74), 1.3);
  ctx.page.drawRectangle({ x: ax, y: ay, width: 5, height: 5, borderColor: ctx.muted, borderWidth: 0.6 });
  label(ctx, "b", (ax + bx) / 2, ay - 7, 6);
  label(ctx, "p", ax - 7, (ay + cy) / 2, 6);
  label(ctx, "h", (bx + cx) / 2 + 4, (by + cy) / 2 + 2, 6);
};

const cellDiagram: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.page.drawEllipse({ x: cx, y: cy, xScale: Math.min(w, h) * 0.4, yScale: Math.min(w, h) * 0.32, color: rgb(0.9, 0.96, 0.92), borderColor: GREEN, borderWidth: 1.2 });
  ctx.page.drawCircle({ x: cx + 4, y: cy, size: 7, color: rgb(0.55, 0.75, 0.6), borderColor: rgb(0.2, 0.5, 0.3), borderWidth: 1 });
  label(ctx, "Nucleus", cx + 4, cy - 16, 5.5);
  label(ctx, "Cell", x + w * 0.2, cy + 10, 5.5);
};

// ───────────────────────── registry ─────────────────────────

interface DiagramEntry {
  draw: Draw;
  desc: string;
}

const CATALOG: Record<string, DiagramEntry> = {
  // chemistry — separation & solutions
  filtration: { draw: filtration, desc: "filtration of an insoluble solid from a liquid (funnel, filter paper, beaker)" },
  evaporation: { draw: evaporation, desc: "evaporation of a solution to leave a solid (dish, tripod, flame)" },
  crystallisation: { draw: crystallisation, desc: "crystallisation: hot solution cooled to form crystals" },
  sublimation: { draw: sublimation, desc: "sublimation: solid to vapour collected as crystals" },
  "magnet-separation": { draw: magnetSeparation, desc: "magnetic separation of iron filings using a magnet" },
  "separating-funnel": { draw: separatingFunnel, desc: "separating funnel for two immiscible liquids" },
  "molecular-pure-mixture": { draw: molecularPureMixture, desc: "particle models comparing a pure substance and a mixture" },
  "beaker-solution": { draw: beakerSolution, desc: "a solution showing solute dissolved in a solvent" },
  "test-tubes": { draw: testTubes, desc: "a chemical reaction in test tubes forming a precipitate" },
  distillation: { draw: distillation, desc: "distillation: boiling and collecting a distillate" },
  // physics — electrostatics / fields / optics / circuits
  "field-lines-positive": { draw: fieldLinesPositive, desc: "electric field lines radiating out of a positive charge" },
  "field-lines-negative": { draw: fieldLinesNegative, desc: "electric field lines pointing into a negative charge" },
  "electric-dipole": { draw: electricDipole, desc: "an electric dipole (+q and -q) with dipole moment p" },
  "coulomb-force": { draw: coulombForce, desc: "Coulomb force between two point charges at distance r" },
  "dipole-in-field": { draw: dipoleInField, desc: "a dipole at an angle in a uniform field experiencing torque" },
  "charging-induction": { draw: chargingInduction, desc: "charging a conductor by induction (charge polarisation)" },
  "gaussian-surface": { draw: gaussianSurface, desc: "a charge enclosed by a Gaussian surface with outward flux" },
  "uniform-field": { draw: uniformField, desc: "a uniform electric field shown as parallel arrows" },
  "ray-diagram-lens": { draw: rayDiagramLens, desc: "ray diagram for a convex lens forming an image" },
  "circuit-simple": { draw: circuitSimple, desc: "a simple electric circuit (cell, resistor, bulb)" },
  // maths / biology / general
  "xy-graph": { draw: xyGraph, desc: "an x-y graph showing how one quantity varies with another" },
  "right-triangle": { draw: rightTriangle, desc: "a right-angled triangle with labelled sides (geometry)" },
  "cell-diagram": { draw: cellDiagram, desc: "a simple biological cell with a nucleus" },
};

export const DIAGRAMS: Record<string, Draw> = Object.fromEntries(
  Object.entries(CATALOG).map(([k, v]) => [k, v.draw]),
);

/** Ordered list of ids offered to the model in the prompt. */
export const DIAGRAM_IDS = Object.keys(CATALOG);

/** `id — description` lines for the prompt so the model picks the right one. */
export const DIAGRAM_CATALOG_LINES = Object.entries(CATALOG).map(
  ([id, v]) => `${id} — ${v.desc}`,
);

export function getDiagram(id?: string | null): Draw {
  if (id && CATALOG[id]) return CATALOG[id].draw;
  return generic;
}
