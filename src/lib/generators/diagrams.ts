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

// ───────────────────────── physics: optics / magnetism / EM ─────────────────────────

function resistorZig(ctx: DiagramCtx, x1: number, y: number, x2: number, c = rgb(0.85, 0.4, 0.2)) {
  const n = 6;
  const dx = (x2 - x1) / n;
  let px = x1;
  let py = y;
  for (let i = 0; i < n; i++) {
    const nx = x1 + dx * (i + 1);
    const ny = i === n - 1 ? y : y + (i % 2 ? -4 : 4);
    line(ctx, px, py, nx, ny, c, 1.1);
    px = nx;
    py = ny;
  }
}

const barMagnetField: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const mw = Math.min(w * 0.5, 60);
  const mh = 12;
  ctx.page.drawRectangle({ x: cx - mw / 2, y: cy - mh / 2, width: mw / 2, height: mh, color: RED });
  ctx.page.drawRectangle({ x: cx, y: cy - mh / 2, width: mw / 2, height: mh, color: rgb(0.2, 0.42, 0.86) });
  label(ctx, "N", cx - mw / 4, cy - 3.5, 7, rgb(1, 1, 1));
  label(ctx, "S", cx + mw / 4, cy - 3.5, 7, rgb(1, 1, 1));
  for (const rx of [mw * 0.72, mw * 0.98, mw * 1.24]) {
    ctx.page.drawEllipse({ x: cx, y: cy, xScale: rx, yScale: rx * 0.5, borderColor: rgb(0.5, 0.55, 0.72), borderWidth: 0.8 });
  }
  vec(ctx, cx - 2, cy + mw * 0.5 * 0.72, cx + 6, cy + mw * 0.5 * 0.72, rgb(0.5, 0.55, 0.72), 0.8);
  label(ctx, "Magnetic field lines", cx, y + 1, 5.5);
};

const concaveMirror: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const mx = x + w * 0.82;
  line(ctx, x + 8, cy, mx, cy, ctx.muted, 0.7);
  let prev: [number, number] | null = null;
  for (let i = 0; i <= 12; i++) {
    const yy = cy - 24 + i * 4;
    const px = mx + Math.pow((yy - cy) / 24, 2) * 12;
    if (prev) line(ctx, prev[0], prev[1], px, yy, rgb(0.16, 0.35, 0.74), 1.4);
    prev = [px, yy];
  }
  vec(ctx, x + w * 0.24, cy, x + w * 0.24, cy + 16, GREEN, 1.2);
  const ix = x + w * 0.52;
  line(ctx, x + w * 0.24, cy + 16, mx, cy + 16, rgb(0.85, 0.4, 0.2), 0.8);
  line(ctx, mx, cy + 16, ix, cy - 12, rgb(0.85, 0.4, 0.2), 0.8);
  vec(ctx, ix, cy, ix, cy - 12, rgb(0.45, 0.28, 0.68), 1.2);
  label(ctx, "Object", x + w * 0.24, y + 1, 5.5);
  label(ctx, "Concave mirror", x + w * 0.8, y + 1, 5.5);
};

const convexMirror: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const mx = x + w * 0.78;
  line(ctx, x + 8, cy, x + w - 6, cy, ctx.muted, 0.7);
  let prev: [number, number] | null = null;
  for (let i = 0; i <= 12; i++) {
    const yy = cy - 24 + i * 4;
    const px = mx - Math.pow((yy - cy) / 24, 2) * 12;
    if (prev) line(ctx, prev[0], prev[1], px, yy, rgb(0.16, 0.35, 0.74), 1.4);
    prev = [px, yy];
  }
  vec(ctx, x + w * 0.2, cy, x + w * 0.2, cy + 16, GREEN, 1.2);
  // reflected ray diverges; virtual image behind (dashed)
  line(ctx, x + w * 0.2, cy + 16, mx - 6, cy + 10, rgb(0.85, 0.4, 0.2), 0.8);
  line(ctx, mx - 6, cy + 10, x + w * 0.2, cy + 22, rgb(0.85, 0.4, 0.2), 0.8);
  vec(ctx, x + w * 0.9, cy, x + w * 0.9, cy + 8, rgb(0.45, 0.28, 0.68), 1);
  label(ctx, "Convex mirror", x + w * 0.75, y + 1, 5.5);
};

const prismDispersion: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ax = cx - 15, ay = cy - 15, bx = cx + 15, by = cy - 15, tx = cx, ty = cy + 17;
  line(ctx, ax, ay, bx, by, GLASS, 1.3);
  line(ctx, bx, by, tx, ty, GLASS, 1.3);
  line(ctx, tx, ty, ax, ay, GLASS, 1.3);
  vec(ctx, x + 6, cy + 2, cx - 7, cy + 2, ctx.ink, 1);
  const cols = [rgb(0.85, 0.1, 0.1), rgb(0.95, 0.55, 0.1), rgb(0.9, 0.85, 0.1), rgb(0.1, 0.7, 0.25), rgb(0.1, 0.4, 0.9), rgb(0.45, 0.1, 0.7)];
  cols.forEach((c, i) => line(ctx, cx + 6, cy - 2, x + w - 6, cy - 12 - i * 3, c, 1));
  label(ctx, "White light", x + w * 0.16, cy + 9, 5);
  label(ctx, "Spectrum", x + w * 0.85, y + 1, 5);
};

const humanEye: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.min(w, h) * 0.34;
  ctx.page.drawCircle({ x: cx, y: cy, size: R, borderColor: GLASS, borderWidth: 1.2 });
  ctx.page.drawEllipse({ x: cx - R * 0.62, y: cy, xScale: 3.4, yScale: R * 0.4, color: rgb(0.72, 0.86, 0.96), borderColor: rgb(0.16, 0.35, 0.74), borderWidth: 1 });
  line(ctx, x + 6, cy + 11, cx - R * 0.62, cy, rgb(0.85, 0.4, 0.2), 0.8);
  line(ctx, x + 6, cy - 11, cx - R * 0.62, cy, rgb(0.85, 0.4, 0.2), 0.8);
  line(ctx, cx - R * 0.62, cy, cx + R * 0.82, cy - 5, rgb(0.85, 0.4, 0.2), 0.8);
  line(ctx, cx - R * 0.62, cy, cx + R * 0.82, cy + 5, rgb(0.85, 0.4, 0.2), 0.8);
  label(ctx, "Lens", cx - R * 0.62, cy - R * 0.5 - 4, 5.5);
  label(ctx, "Retina", cx + R * 0.6, cy + R * 0.5, 5.5);
};

const emInduction: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const coilX = x + w * 0.5;
  for (let i = 0; i < 4; i++)
    ctx.page.drawEllipse({ x: coilX + i * 6, y: cy, xScale: 3, yScale: 12, borderColor: rgb(0.72, 0.45, 0.2), borderWidth: 1.2 });
  ctx.page.drawRectangle({ x: x + w * 0.12, y: cy - 5, width: 20, height: 10, color: RED });
  label(ctx, "N", x + w * 0.12 + 10, cy - 3, 6, rgb(1, 1, 1));
  vec(ctx, x + w * 0.34, cy, x + w * 0.44, cy, ctx.ink, 1);
  line(ctx, coilX + 18, cy - 12, coilX + 18, y + h * 0.22, ctx.ink, 0.8);
  line(ctx, coilX + 18, y + h * 0.22, x + w * 0.9, y + h * 0.22, ctx.ink, 0.8);
  ctx.page.drawCircle({ x: x + w * 0.9, y: y + h * 0.22, size: 8, borderColor: GREEN, borderWidth: 1 });
  label(ctx, "G", x + w * 0.9, y + h * 0.22 - 3, 7, GREEN);
  label(ctx, "Moving magnet induces current", cx0(x, w), y + 1, 5.5);
};

function cx0(x: number, w: number) {
  return x + w / 2;
}

const resistorsSeries: Draw = (ctx, x, y, w, h) => {
  const t = y + h - 12, b = y + 12, l = x + 12, r = x + w - 12;
  line(ctx, l, b, l, t, ctx.ink, 1);
  line(ctx, r, b, r, t, ctx.ink, 1);
  line(ctx, l, b, r, b, ctx.ink, 1);
  // battery at left top
  line(ctx, l, t, x + w * 0.3, t, ctx.ink, 1);
  line(ctx, x + w * 0.32, t - 4, x + w * 0.32, t + 4, ctx.ink, 1.6);
  line(ctx, x + w * 0.36, t - 2, x + w * 0.36, t + 2, ctx.ink, 3);
  line(ctx, x + w * 0.38, t, r, t, ctx.ink, 1);
  // two resistors along the bottom
  resistorZig(ctx, x + w * 0.28, b, x + w * 0.48);
  resistorZig(ctx, x + w * 0.58, b, x + w * 0.78);
  label(ctx, "R1", x + w * 0.38, b - 8, 5.5);
  label(ctx, "R2", x + w * 0.68, b - 8, 5.5);
  label(ctx, "Series", x + w / 2, y + 1, 5.5);
};

const resistorsParallel: Draw = (ctx, x, y, w, h) => {
  const t = y + h - 12, b = y + 12, l = x + 12, r = x + w - 12;
  // outer loop
  line(ctx, l, b, l, t, ctx.ink, 1);
  line(ctx, l, t, r, t, ctx.ink, 1);
  line(ctx, r, b, r, t, ctx.ink, 1);
  line(ctx, l, b, r, b, ctx.ink, 1);
  // battery on the left rail
  line(ctx, l - 4, (t + b) / 2 + 4, l + 4, (t + b) / 2 + 4, ctx.ink, 1.6);
  line(ctx, l - 2, (t + b) / 2 - 2, l + 2, (t + b) / 2 - 2, ctx.ink, 3);
  // two vertical resistors bridging the top and bottom rails
  vResistor(ctx, x + w * 0.42, b, t);
  vResistor(ctx, x + w * 0.66, b, t);
  label(ctx, "R1", x + w * 0.42 + 7, (t + b) / 2, 5.5);
  label(ctx, "R2", x + w * 0.66 + 7, (t + b) / 2, 5.5);
  label(ctx, "Parallel", x + w / 2, y + 1, 5.5);
};

function vResistor(ctx: DiagramCtx, x: number, y1: number, y2: number, c = rgb(0.85, 0.4, 0.2)) {
  const n = 6;
  const dy = (y2 - y1) / n;
  let px = x;
  let py = y1;
  for (let i = 0; i < n; i++) {
    const ny = y1 + dy * (i + 1);
    const nx = i === n - 1 ? x : x + (i % 2 ? -4 : 4);
    line(ctx, px, py, nx, ny, c, 1.1);
    px = nx;
    py = ny;
  }
}

// ───────────────────────── physics: class 12 additions ─────────────────────────

const acWaveform: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  vec(ctx, x + 10, cy, x + w - 6, cy, ctx.ink, 0.9);
  vec(ctx, x + 12, y + 8, x + 12, y + h - 6, ctx.ink, 0.9);
  let px = x + 14;
  let py = cy;
  for (let i = 1; i <= 48; i++) {
    const nx = x + 14 + (i * (w - 26)) / 48;
    const ny = cy + Math.sin((i / 48) * Math.PI * 4) * (h * 0.3);
    line(ctx, px, py, nx, ny, rgb(0.16, 0.35, 0.74), 1.3);
    px = nx;
    py = ny;
  }
  label(ctx, "Alternating current (sinusoidal)", x + w / 2, y + 1, 5.5);
};

const emSpectrum: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const bx = x + 8;
  const bw = w - 16;
  const bands: [RGB, string][] = [
    [rgb(0.5, 0.3, 0.6), "Radio"], [rgb(0.3, 0.4, 0.8), "MW"], [rgb(0.2, 0.6, 0.8), "IR"],
    [rgb(0.2, 0.75, 0.4), "Vis"], [rgb(0.9, 0.8, 0.2), "UV"], [rgb(0.9, 0.5, 0.2), "X"], [rgb(0.8, 0.2, 0.2), "γ"],
  ];
  const sw = bw / bands.length;
  bands.forEach(([c, lab], i) => {
    ctx.page.drawRectangle({ x: bx + i * sw, y: cy - 8, width: sw + 0.5, height: 16, color: c });
    label(ctx, lab, bx + i * sw + sw / 2, cy - 18, 5);
  });
  vec(ctx, bx, cy + 14, bx + bw, cy + 14, ctx.muted, 0.7);
  label(ctx, "Increasing frequency →", x + w / 2, y + 1, 5.5);
};

const youngDoubleSlit: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  ctx.page.drawCircle({ x: x + 12, y: cy, size: 2.5, color: FLAME });
  // barrier with two slits
  const bx = x + w * 0.42;
  line(ctx, bx, y + 10, bx, cy - 8, GLASS, 1.4);
  line(ctx, bx, cy - 4, bx, cy + 4, GLASS, 1.4);
  line(ctx, bx, cy + 8, bx, y + h - 10, GLASS, 1.4);
  // rays from source to slits then to screen
  line(ctx, x + 12, cy, bx, cy - 6, rgb(0.95, 0.7, 0.1), 0.7);
  line(ctx, x + 12, cy, bx, cy + 6, rgb(0.95, 0.7, 0.1), 0.7);
  // screen with fringes
  const scx = x + w - 12;
  for (let i = 0; i < 9; i++) {
    const fy = y + 12 + i * ((h - 24) / 8);
    ctx.page.drawRectangle({ x: scx - 4, y: fy - 1.5, width: 6, height: 3, color: i % 2 ? rgb(0.95, 0.95, 0.98) : rgb(0.16, 0.35, 0.74) });
    line(ctx, bx, cy - 6, scx - 4, fy, rgb(0.8, 0.85, 0.95), 0.25);
  }
  label(ctx, "Interference fringes", x + w * 0.7, y + 1, 5.5);
};

const photoelectric: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  // metal plate
  ctx.page.drawRectangle({ x: x + w * 0.3, y: cy - 18, width: 6, height: 36, color: METAL });
  // incoming photons (arrows) from top-left
  for (let i = 0; i < 3; i++) vec(ctx, x + 8 + i * 8, y + h - 8, x + w * 0.3 - 4, cy - 6 + i * 6, rgb(0.95, 0.7, 0.1), 0.9);
  label(ctx, "hν", x + 12, y + h - 10, 6, rgb(0.9, 0.6, 0.1));
  // ejected electrons
  for (let i = 0; i < 4; i++) {
    const ex = x + w * 0.42 + i * 10;
    ctx.page.drawCircle({ x: ex, y: cy - 8 + (i % 2) * 12, size: 2.4, color: rgb(0.2, 0.42, 0.86) });
    label(ctx, "-", ex, cy - 10 + (i % 2) * 12, 6, rgb(1, 1, 1));
  }
  label(ctx, "Photoelectrons emitted", x + w / 2, y + 1, 5.5);
};

const pnJunction: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const bx = x + w * 0.25;
  const bw = w * 0.5;
  ctx.page.drawRectangle({ x: bx, y: cy - 12, width: bw / 2, height: 24, color: rgb(0.98, 0.85, 0.85), borderColor: RED, borderWidth: 1 });
  ctx.page.drawRectangle({ x: bx + bw / 2, y: cy - 12, width: bw / 2, height: 24, color: rgb(0.85, 0.9, 0.99), borderColor: rgb(0.2, 0.42, 0.86), borderWidth: 1 });
  // depletion region
  ctx.page.drawRectangle({ x: bx + bw / 2 - 3, y: cy - 12, width: 6, height: 24, color: rgb(0.9, 0.9, 0.92) });
  label(ctx, "P", bx + bw / 4, cy - 3, 8, RED);
  label(ctx, "N", bx + (3 * bw) / 4, cy - 3, 8, rgb(0.2, 0.42, 0.86));
  label(ctx, "depletion region", bx + bw / 2, cy - 22, 5);
  label(ctx, "p–n junction diode", x + w / 2, y + 1, 5.5);
};

// ───────────────────────── chemistry / biology / maths ─────────────────────────

const atomBohr: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.page.drawCircle({ x: cx, y: cy, size: 5, color: RED });
  [11, 19, 27].forEach((r) => {
    ctx.page.drawEllipse({ x: cx, y: cy, xScale: r, yScale: r * 0.66, borderColor: rgb(0.5, 0.55, 0.72), borderWidth: 0.8 });
    ctx.page.drawCircle({ x: cx + r, y: cy, size: 2, color: rgb(0.16, 0.35, 0.74) });
    ctx.page.drawCircle({ x: cx - r, y: cy, size: 2, color: rgb(0.16, 0.35, 0.74) });
  });
  label(ctx, "Nucleus", cx, cy - 12, 5.5);
  label(ctx, "Electron shells", cx, y + 1, 5.5);
};

const phScale: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const bx = x + 12;
  const bw = w - 24;
  const seg = 14;
  for (let i = 0; i < seg; i++) {
    const c =
      i < 7
        ? rgb(0.9 - i * 0.03, 0.25 + i * 0.07, 0.12)
        : rgb(0.12, 0.6 - (i - 7) * 0.06, 0.55 + (i - 7) * 0.05);
    ctx.page.drawRectangle({ x: bx + (i * bw) / seg, y: cy - 6, width: bw / seg + 0.6, height: 12, color: c });
  }
  label(ctx, "0", bx, cy - 16, 6);
  label(ctx, "7", bx + bw / 2, cy - 16, 6);
  label(ctx, "14", bx + bw, cy - 16, 6);
  label(ctx, "Acidic", bx + bw * 0.2, cy + 10, 5.5);
  label(ctx, "Neutral", bx + bw * 0.5, cy + 10, 5.5);
  label(ctx, "Basic", bx + bw * 0.8, cy + 10, 5.5);
};

const plantCell: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cw = Math.min(w * 0.7, 90);
  const ch = Math.min(h * 0.7, 56);
  ctx.page.drawRectangle({ x: cx - cw / 2, y: cy - ch / 2, width: cw, height: ch, borderColor: rgb(0.2, 0.5, 0.3), borderWidth: 1.6 }); // cell wall
  ctx.page.drawRectangle({ x: cx - cw / 2 + 3, y: cy - ch / 2 + 3, width: cw - 6, height: ch - 6, color: rgb(0.93, 0.98, 0.94) });
  ctx.page.drawCircle({ x: cx - cw * 0.2, y: cy + ch * 0.1, size: 7, color: rgb(0.6, 0.75, 0.6), borderColor: rgb(0.2, 0.5, 0.3), borderWidth: 1 });
  for (let i = 0; i < 4; i++)
    ctx.page.drawEllipse({ x: cx + cw * 0.15 + (i % 2) * 12, y: cy + (i < 2 ? 6 : -8), xScale: 4, yScale: 2.4, color: GREEN }); // chloroplasts
  label(ctx, "Nucleus", cx - cw * 0.2, cy - ch * 0.5 + 2, 5.5);
  label(ctx, "Plant cell", cx, y + 1, 5.5);
};

const animalCell: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.page.drawEllipse({ x: cx, y: cy, xScale: Math.min(w, h) * 0.42, yScale: Math.min(w, h) * 0.34, color: rgb(0.98, 0.95, 0.9), borderColor: rgb(0.8, 0.55, 0.4), borderWidth: 1.4 });
  ctx.page.drawCircle({ x: cx, y: cy, size: 8, color: rgb(0.75, 0.6, 0.8), borderColor: rgb(0.5, 0.3, 0.55), borderWidth: 1 });
  ctx.page.drawCircle({ x: cx, y: cy, size: 3, color: rgb(0.5, 0.3, 0.55) });
  for (let i = 0; i < 3; i++)
    ctx.page.drawEllipse({ x: cx + 16 + i * 4, y: cy + 8 - i * 8, xScale: 4, yScale: 2, color: rgb(0.9, 0.6, 0.4) });
  label(ctx, "Nucleus", cx, cy - 16, 5.5);
  label(ctx, "Animal cell", cx, y + 1, 5.5);
};

const neuron: Draw = (ctx, x, y, w, h) => {
  const cx = x + w * 0.3;
  const cy = y + h / 2;
  ctx.page.drawCircle({ x: cx, y: cy, size: 9, color: rgb(0.95, 0.9, 0.8), borderColor: rgb(0.7, 0.45, 0.3), borderWidth: 1.2 });
  ctx.page.drawCircle({ x: cx, y: cy, size: 3.5, color: rgb(0.7, 0.45, 0.3) });
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.6 + i * 0.2);
    line(ctx, cx + 9 * Math.cos(a), cy + 9 * Math.sin(a), cx + 20 * Math.cos(a), cy + 20 * Math.sin(a), rgb(0.7, 0.45, 0.3), 0.9);
  }
  line(ctx, cx + 9, cy, x + w * 0.8, cy, rgb(0.7, 0.45, 0.3), 1.4); // axon
  for (let i = -1; i <= 1; i++) line(ctx, x + w * 0.8, cy, x + w * 0.88, cy + i * 5, rgb(0.7, 0.45, 0.3), 0.9);
  label(ctx, "Cell body", cx, cy - 16, 5.5);
  label(ctx, "Axon", x + w * 0.6, cy + 5, 5.5);
};

const photosynthesis: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.page.drawEllipse({ x: cx, y: cy, xScale: Math.min(w, h) * 0.32, yScale: Math.min(w, h) * 0.24, color: rgb(0.75, 0.9, 0.6), borderColor: GREEN, borderWidth: 1.2 });
  line(ctx, cx, cy - Math.min(w, h) * 0.24, cx, y + 6, GREEN, 1); // stem
  // sun
  ctx.page.drawCircle({ x: x + w * 0.12, y: y + h * 0.8, size: 6, color: rgb(0.98, 0.8, 0.2) });
  vec(ctx, x + w * 0.2, y + h * 0.72, cx - 14, cy + 6, rgb(0.95, 0.7, 0.1), 0.8);
  vec(ctx, x + 8, cy - 4, cx - 16, cy - 2, rgb(0.4, 0.45, 0.55), 0.8); // CO2 in
  vec(ctx, cx + 16, cy + 2, x + w - 8, cy + 6, rgb(0.16, 0.35, 0.74), 0.8); // O2 out
  label(ctx, "CO2", x + w * 0.1, cy - 2, 5.5);
  label(ctx, "O2", x + w * 0.9, cy + 6, 5.5, rgb(0.16, 0.35, 0.74));
  label(ctx, "Sunlight", x + w * 0.12, y + h * 0.8 - 10, 5.5);
};

const circleRadius: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.min(w, h) * 0.34;
  ctx.page.drawCircle({ x: cx, y: cy, size: R, borderColor: rgb(0.16, 0.35, 0.74), borderWidth: 1.4 });
  ctx.page.drawCircle({ x: cx, y: cy, size: 1.6, color: ctx.ink });
  line(ctx, cx, cy, cx + R, cy, RED, 1.2);
  label(ctx, "r", cx + R * 0.5, cy + 3, 6, RED);
  label(ctx, "O", cx - 5, cy - 7, 6);
  label(ctx, "Circle", cx, y + 1, 5.5);
};

const barGraph: Draw = (ctx, x, y, w, h) => {
  const ox = x + 14;
  const oy = y + 12;
  line(ctx, ox, oy, ox, y + h - 6, ctx.ink, 1);
  line(ctx, ox, oy, x + w - 6, oy, ctx.ink, 1);
  const heights = [0.4, 0.7, 0.55, 0.9, 0.6];
  const bw = (w - 30) / (heights.length * 1.6);
  heights.forEach((f, i) => {
    const bx = ox + 6 + i * bw * 1.6;
    ctx.page.drawRectangle({ x: bx, y: oy + 1, width: bw, height: (h - 24) * f, color: CARD_BAR[i % CARD_BAR.length] });
  });
  label(ctx, "Bar graph", x + w / 2, y + 1, 5.5);
};

const CARD_BAR = [
  rgb(0.16, 0.35, 0.74),
  rgb(0.14, 0.55, 0.34),
  rgb(0.86, 0.42, 0.09),
  rgb(0.45, 0.28, 0.68),
  rgb(0.76, 0.12, 0.42),
];

// ───────────────────────── more chemistry: separation ─────────────────────────

const sedimentation: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const bh = h * 0.6;
  const bw = 40;
  const l = cx - bw / 2;
  ctx.page.drawRectangle({ x: l + 1, y: y + 10 + bh * 0.32, width: bw - 2, height: bh * 0.58, color: LIQUID });
  ctx.page.drawRectangle({ x: l + 1, y: y + 10, width: bw - 2, height: bh * 0.32, color: SAND });
  line(ctx, l, y + 10 + bh, l, y + 10, GLASS, 1.2);
  line(ctx, cx + bw / 2, y + 10 + bh, cx + bw / 2, y + 10, GLASS, 1.2);
  line(ctx, l, y + 10, cx + bw / 2, y + 10, GLASS, 1.2);
  label(ctx, "Clear water", cx, y + 10 + bh + 3, 5.5);
  label(ctx, "Sediment settles", cx, y + 1, 5.5);
};

const decantation: Draw = (ctx, x, y, w, h) => {
  beaker(ctx, x + w * 0.72, y + 8, 32, h * 0.44, 0.55, LIQUID);
  const lx = x + w * 0.3;
  const bh = h * 0.44;
  // tilted source beaker (parallelogram)
  const t = 8;
  line(ctx, lx - 16, y + 10, lx + 16 + t, y + 10, GLASS, 1.2);
  line(ctx, lx - 16, y + 10, lx - 16 + t, y + 10 + bh, GLASS, 1.2);
  line(ctx, lx + 16 + t, y + 10, lx + 16 + t * 2, y + 10 + bh, GLASS, 1.2);
  ctx.page.drawRectangle({ x: lx - 14, y: y + 11, width: 30, height: 5, color: SAND });
  // pour stream to right beaker
  line(ctx, lx + 16 + t * 2, y + 10 + bh, x + w * 0.72 - 8, y + 8 + bh, LIQUID_DEEP, 1.4);
  label(ctx, "Pour off the clear liquid", x + w / 2, y + 1, 5.5);
};

const handpicking: Draw = (ctx, x, y, w, h) => {
  ctx.page.drawEllipse({ x: x + w / 2, y: y + h * 0.3, xScale: w * 0.3, yScale: h * 0.13, color: SAND, borderColor: rgb(0.6, 0.45, 0.28), borderWidth: 1 });
  for (let i = 0; i < 10; i++)
    ctx.page.drawCircle({ x: x + w * 0.36 + (i % 5) * 8, y: y + h * 0.3 + (i < 5 ? 2 : -3), size: 1.4, color: rgb(0.85, 0.75, 0.4) });
  ctx.page.drawCircle({ x: x + w * 0.52, y: y + h * 0.32, size: 3, color: rgb(0.4, 0.4, 0.45) });
  const hx = x + w * 0.52;
  const hy = y + h * 0.72;
  ctx.page.drawEllipse({ x: hx, y: hy, xScale: 8, yScale: 5, color: rgb(0.98, 0.86, 0.72), borderColor: rgb(0.8, 0.6, 0.5), borderWidth: 0.8 });
  for (let i = -1; i <= 1; i++) line(ctx, hx + i * 4, hy - 3, hx + i * 4, hy - 12, rgb(0.98, 0.86, 0.72), 2);
  line(ctx, hx, hy - 3, hx, y + h * 0.36, ctx.muted, 0.5);
  label(ctx, "Pick out stones by hand", x + w / 2, y + 1, 5.5);
};

const winnowing: Draw = (ctx, x, y, w, h) => {
  ctx.page.drawEllipse({ x: x + w * 0.4, y: y + h * 0.82, xScale: 14, yScale: 4, color: SAND });
  for (let i = 0; i < 6; i++)
    ctx.page.drawCircle({ x: x + w * 0.4 + (i % 2 ? 2 : -2), y: y + h * 0.72 - i * 8, size: 1.5, color: rgb(0.82, 0.62, 0.32) });
  for (let i = 0; i < 3; i++)
    vec(ctx, x + w * 0.5, y + h * 0.52 - i * 7, x + w * 0.86, y + h * 0.46 - i * 7, rgb(0.6, 0.7, 0.85), 0.8);
  for (let i = 0; i < 4; i++)
    ctx.page.drawCircle({ x: x + w * 0.7 + i * 6, y: y + h * 0.5 - (i % 2) * 4, size: 1, color: rgb(0.72, 0.62, 0.42) });
  label(ctx, "Wind carries lighter husk", x + w / 2, y + 1, 5.5);
};

const chromatography: Draw = (ctx, x, y, w, h) => {
  const px = x + w / 2;
  const sh = h * 0.66;
  ctx.page.drawRectangle({ x: px - 8, y: y + 12, width: 16, height: sh, color: rgb(0.99, 0.98, 0.93), borderColor: ctx.muted, borderWidth: 0.8 });
  line(ctx, px - 8, y + 12 + sh * 0.9, px + 8, y + 12 + sh * 0.9, rgb(0.6, 0.7, 0.85), 0.6);
  ctx.page.drawCircle({ x: px, y: y + 12 + sh * 0.2, size: 2.2, color: rgb(0.2, 0.5, 0.9) });
  ctx.page.drawCircle({ x: px, y: y + 12 + sh * 0.42, size: 2.2, color: rgb(0.2, 0.7, 0.4) });
  ctx.page.drawCircle({ x: px, y: y + 12 + sh * 0.66, size: 2.2, color: rgb(0.9, 0.5, 0.2) });
  label(ctx, "Paper chromatography", px, y + 1, 5.5);
};

const solubilityCurve: Draw = (ctx, x, y, w, h) => {
  const ox = x + 16;
  const oy = y + 14;
  vec(ctx, ox, oy, ox, y + h - 6, ctx.ink, 1);
  vec(ctx, ox, oy, x + w - 6, oy, ctx.ink, 1);
  let px = ox + 2;
  let py = oy + 4;
  for (let i = 1; i <= 20; i++) {
    const nx = ox + 2 + i * ((w - 26) / 20);
    const ny = oy + 4 + Math.pow(i / 20, 1.6) * (h - 26);
    line(ctx, px, py, nx, ny, rgb(0.14, 0.55, 0.34), 1.4);
    px = nx;
    py = ny;
  }
  label(ctx, "Temperature", x + w * 0.6, oy - 8, 5.5);
  label(ctx, "Solubility", ox - 8, y + h - 8, 5.5);
};

// ───────────────────────── more physics ─────────────────────────

const solenoid: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const n = 6;
  const sx = x + w * 0.28;
  for (let i = 0; i < n; i++)
    ctx.page.drawEllipse({ x: sx + i * 8, y: cy, xScale: 3, yScale: 12, borderColor: rgb(0.72, 0.45, 0.2), borderWidth: 1.2 });
  vec(ctx, sx - 14, cy, sx + n * 8 + 12, cy, rgb(0.16, 0.35, 0.74), 1);
  label(ctx, "N", sx - 16, cy + 5, 6, RED);
  label(ctx, "S", sx + n * 8 + 10, cy + 5, 6, rgb(0.2, 0.42, 0.86));
  label(ctx, "Solenoid", x + w / 2, y + 1, 5.5);
};

const capacitor: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const p1 = x + w * 0.42;
  const p2 = x + w * 0.58;
  line(ctx, p1, cy - 16, p1, cy + 16, RED, 2);
  line(ctx, p2, cy - 16, p2, cy + 16, rgb(0.2, 0.42, 0.86), 2);
  for (let i = -1; i <= 1; i++) vec(ctx, p1 + 2, cy + i * 10, p2 - 2, cy + i * 10, rgb(0.5, 0.55, 0.72), 0.8);
  label(ctx, "+", p1 - 6, cy - 2, 8, RED);
  label(ctx, "-", p2 + 4, cy - 2, 9, rgb(0.2, 0.42, 0.86));
  line(ctx, p1, cy + 16, p1, y + h - 8, ctx.ink, 0.8);
  line(ctx, p2, cy - 16, p2, y + 8, ctx.ink, 0.8);
  label(ctx, "Capacitor (parallel plates)", x + w / 2, y + 1, 5.5);
};

const transformer: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  ctx.page.drawRectangle({ x: x + w * 0.44, y: cy - 20, width: 5, height: 40, color: METAL });
  ctx.page.drawRectangle({ x: x + w * 0.54, y: cy - 20, width: 5, height: 40, color: METAL });
  for (let i = 0; i < 4; i++)
    ctx.page.drawEllipse({ x: x + w * 0.44 + 2.5, y: cy - 12 + i * 8, xScale: 8, yScale: 3, borderColor: rgb(0.72, 0.45, 0.2), borderWidth: 1 });
  for (let i = 0; i < 4; i++)
    ctx.page.drawEllipse({ x: x + w * 0.54 + 2.5, y: cy - 12 + i * 8, xScale: 8, yScale: 3, borderColor: rgb(0.16, 0.35, 0.74), borderWidth: 1 });
  label(ctx, "P", x + w * 0.3, cy - 2, 6, rgb(0.72, 0.45, 0.2));
  label(ctx, "S", x + w * 0.7, cy - 2, 6, rgb(0.16, 0.35, 0.74));
  label(ctx, "Transformer", x + w / 2, y + 1, 5.5);
};

// ───────────────────────── more biology / maths ─────────────────────────

const dnaHelix: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const amp = 11;
  const bot = y + 12;
  const top = y + h - 8;
  const steps = 16;
  let p1: [number, number] | null = null;
  let p2: [number, number] | null = null;
  for (let i = 0; i <= steps; i++) {
    const yy = bot + ((top - bot) * i) / steps;
    const ph = (i / steps) * Math.PI * 3;
    const x1 = cx + amp * Math.sin(ph);
    const x2 = cx + amp * Math.sin(ph + Math.PI);
    if (p1 && p2) {
      line(ctx, p1[0], p1[1], x1, yy, rgb(0.16, 0.35, 0.74), 1.2);
      line(ctx, p2[0], p2[1], x2, yy, rgb(0.76, 0.12, 0.42), 1.2);
    }
    if (i % 2 === 0) line(ctx, x1, yy, x2, yy, rgb(0.6, 0.65, 0.75), 0.7);
    p1 = [x1, yy];
    p2 = [x2, yy];
  }
  label(ctx, "DNA double helix", cx, y + 1, 5.5);
};

const leafStructure: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const L = Math.min(w, h) * 0.38;
  ctx.page.drawEllipse({ x: cx, y: cy, xScale: L, yScale: Math.min(w, h) * 0.22, color: rgb(0.82, 0.93, 0.66), borderColor: GREEN, borderWidth: 1.2 });
  line(ctx, cx - L, cy, cx + L, cy, GREEN, 1);
  for (let i = 1; i <= 3; i++) {
    const dxl = -L + i * L * 0.4;
    line(ctx, cx + dxl, cy, cx + dxl + 8, cy + 7, GREEN, 0.6);
    line(ctx, cx + dxl, cy, cx + dxl + 8, cy - 7, GREEN, 0.6);
  }
  label(ctx, "Leaf structure (veins)", cx, y + 1, 5.5);
};

const vennDiagram: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.27;
  ctx.page.drawCircle({ x: x + w / 2 - r * 0.6, y: cy, size: r, borderColor: rgb(0.16, 0.35, 0.74), borderWidth: 1.3 });
  ctx.page.drawCircle({ x: x + w / 2 + r * 0.6, y: cy, size: r, borderColor: rgb(0.76, 0.12, 0.42), borderWidth: 1.3 });
  label(ctx, "A", x + w / 2 - r * 1.15, cy - 2, 7, rgb(0.16, 0.35, 0.74));
  label(ctx, "B", x + w / 2 + r * 1.15, cy - 2, 7, rgb(0.76, 0.12, 0.42));
  label(ctx, "Venn diagram", x + w / 2, y + 1, 5.5);
};

const coordinatePlane: Draw = (ctx, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  vec(ctx, cx, cy, x + w - 8, cy, ctx.ink, 0.9);
  vec(ctx, cx, cy, x + 10, cy, ctx.ink, 0.9);
  vec(ctx, cx, cy, cx, y + h - 8, ctx.ink, 0.9);
  vec(ctx, cx, cy, cx, y + 10, ctx.ink, 0.9);
  ctx.page.drawCircle({ x: cx + 18, y: cy + 12, size: 2.4, color: RED });
  line(ctx, cx + 18, cy, cx + 18, cy + 12, ctx.muted, 0.5);
  line(ctx, cx, cy + 12, cx + 18, cy + 12, ctx.muted, 0.5);
  label(ctx, "P(x, y)", cx + 30, cy + 14, 5.5, RED);
  label(ctx, "x", x + w - 8, cy - 7, 6);
  label(ctx, "y", cx - 6, y + h - 8, 6);
};

const numberLine: Draw = (ctx, x, y, w, h) => {
  const cy = y + h / 2;
  const l = x + 16;
  const r = x + w - 16;
  vec(ctx, (l + r) / 2, cy, r, cy, ctx.ink, 0.9);
  vec(ctx, (l + r) / 2, cy, l, cy, ctx.ink, 0.9);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const px = l + (i * (r - l)) / (n - 1);
    line(ctx, px, cy - 3, px, cy + 3, ctx.ink, 0.9);
    label(ctx, String(i - 2), px, cy - 11, 5.5);
  }
  ctx.page.drawCircle({ x: l + (3 * (r - l)) / (n - 1), y: cy, size: 2.6, color: RED });
  label(ctx, "Number line", x + w / 2, y + 1, 5.5);
};

// ───────────────────────── registry ─────────────────────────

interface DiagramEntry {
  draw: Draw;
  desc: string;
}

export const CATALOG: Record<string, DiagramEntry> = {
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
  sedimentation: { draw: sedimentation, desc: "sedimentation: an insoluble solid settling below clear water" },
  decantation: { draw: decantation, desc: "decantation: pouring off the clear liquid above a sediment" },
  handpicking: { draw: handpicking, desc: "handpicking large impurities out of grains by hand" },
  winnowing: { draw: winnowing, desc: "winnowing: wind separating lighter husk from heavier grain" },
  chromatography: { draw: chromatography, desc: "paper chromatography separating a mixture into coloured spots" },
  "solubility-curve": { draw: solubilityCurve, desc: "a solubility vs temperature curve" },
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
  "bar-magnet-field": { draw: barMagnetField, desc: "magnetic field lines around a bar magnet (N and S poles)" },
  "concave-mirror": { draw: concaveMirror, desc: "ray diagram for a concave mirror forming an image" },
  "convex-mirror": { draw: convexMirror, desc: "ray diagram for a convex mirror (virtual image)" },
  "prism-dispersion": { draw: prismDispersion, desc: "dispersion of white light into a spectrum through a prism" },
  "human-eye": { draw: humanEye, desc: "structure of the human eye (lens, retina) focusing light" },
  "em-induction": { draw: emInduction, desc: "electromagnetic induction: a magnet moved into a coil with a galvanometer" },
  "resistors-series": { draw: resistorsSeries, desc: "resistors connected in series in a circuit" },
  "resistors-parallel": { draw: resistorsParallel, desc: "resistors connected in parallel in a circuit" },
  solenoid: { draw: solenoid, desc: "a current-carrying solenoid acting as an electromagnet" },
  capacitor: { draw: capacitor, desc: "a parallel-plate capacitor storing charge" },
  transformer: { draw: transformer, desc: "a transformer: primary and secondary coils on a core" },
  "ac-waveform": { draw: acWaveform, desc: "a sinusoidal alternating current/voltage waveform" },
  "em-spectrum": { draw: emSpectrum, desc: "the electromagnetic spectrum from radio waves to gamma rays" },
  "young-double-slit": { draw: youngDoubleSlit, desc: "Young's double-slit experiment producing interference fringes" },
  "photoelectric-effect": { draw: photoelectric, desc: "the photoelectric effect: photons ejecting electrons from a metal" },
  "pn-junction": { draw: pnJunction, desc: "a p–n junction diode with a depletion region" },
  // chemistry
  "atom-bohr": { draw: atomBohr, desc: "Bohr model of an atom: nucleus with electrons in shells" },
  "ph-scale": { draw: phScale, desc: "the pH scale from acidic (0) to neutral (7) to basic (14)" },
  // maths / biology / general
  "xy-graph": { draw: xyGraph, desc: "an x-y graph showing how one quantity varies with another" },
  "right-triangle": { draw: rightTriangle, desc: "a right-angled triangle with labelled sides (geometry)" },
  "circle-radius": { draw: circleRadius, desc: "a circle with centre and radius r labelled (geometry)" },
  "bar-graph": { draw: barGraph, desc: "a bar graph / column chart of values" },
  "coordinate-plane": { draw: coordinatePlane, desc: "a coordinate plane (x-y axes) with a plotted point" },
  "number-line": { draw: numberLine, desc: "a number line with marked integers" },
  "venn-diagram": { draw: vennDiagram, desc: "a Venn diagram of two overlapping sets A and B" },
  "cell-diagram": { draw: cellDiagram, desc: "a generic biological cell with a nucleus" },
  "plant-cell": { draw: plantCell, desc: "a plant cell with cell wall, nucleus and chloroplasts" },
  "animal-cell": { draw: animalCell, desc: "an animal cell with nucleus and organelles" },
  neuron: { draw: neuron, desc: "a neuron / nerve cell with cell body, dendrites and axon" },
  photosynthesis: { draw: photosynthesis, desc: "photosynthesis in a leaf: sunlight, CO2 in, O2 out" },
  "dna-helix": { draw: dnaHelix, desc: "the DNA double helix structure" },
  leaf: { draw: leafStructure, desc: "the structure of a leaf with veins" },
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
