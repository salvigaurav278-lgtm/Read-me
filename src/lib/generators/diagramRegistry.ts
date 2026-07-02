// Diagram registry: subject libraries, semantic concept→diagram matching, and
// an optional drop-in asset path. Built on the vector CATALOG in diagrams.ts.
//
// - `matchDiagram(text, aiId)` resolves the best diagram for a section: it
//   trusts a valid AI-provided id first, otherwise infers one from the section
//   text using curated synonyms (so "filter paper" / "separate sand and water"
//   both map to `filtration`).
// - Drop a `<id>.png` into `assets/diagrams/` to override/extend a diagram
//   without code changes; the renderer embeds it automatically.

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { CATALOG } from "./diagrams";

export type Subject = "Physics" | "Chemistry" | "Biology" | "Mathematics" | "General";

const SUBJECT: Record<string, Subject> = {
  // Chemistry
  filtration: "Chemistry", evaporation: "Chemistry", crystallisation: "Chemistry",
  sublimation: "Chemistry", "magnet-separation": "Chemistry", "separating-funnel": "Chemistry",
  "molecular-pure-mixture": "Chemistry", "beaker-solution": "Chemistry", "test-tubes": "Chemistry",
  distillation: "Chemistry", sedimentation: "Chemistry", decantation: "Chemistry",
  handpicking: "Chemistry", winnowing: "Chemistry", chromatography: "Chemistry",
  "solubility-curve": "Chemistry", "atom-bohr": "Chemistry", "ph-scale": "Chemistry",
  // Physics
  "field-lines-positive": "Physics", "field-lines-negative": "Physics", "electric-dipole": "Physics",
  "coulomb-force": "Physics", "dipole-in-field": "Physics", "charging-induction": "Physics",
  "gaussian-surface": "Physics", "uniform-field": "Physics", "ray-diagram-lens": "Physics",
  "circuit-simple": "Physics", "bar-magnet-field": "Physics", "concave-mirror": "Physics",
  "convex-mirror": "Physics", "prism-dispersion": "Physics", "human-eye": "Physics",
  "em-induction": "Physics", "resistors-series": "Physics", "resistors-parallel": "Physics",
  solenoid: "Physics", capacitor: "Physics", transformer: "Physics",
  // Biology
  "cell-diagram": "Biology", "plant-cell": "Biology", "animal-cell": "Biology",
  neuron: "Biology", photosynthesis: "Biology", "dna-helix": "Biology", leaf: "Biology",
  // Mathematics
  "xy-graph": "Mathematics", "right-triangle": "Mathematics", "circle-radius": "Mathematics",
  "bar-graph": "Mathematics", "coordinate-plane": "Mathematics", "number-line": "Mathematics",
  "venn-diagram": "Mathematics",
};

// Curated synonyms so free-text concepts map to the right diagram. Keep terms
// specific (>=4 chars) to avoid false matches.
const SYNONYMS: Record<string, string[]> = {
  filtration: ["filtration", "filter", "filter paper", "filtrate", "residue", "sand and water"],
  evaporation: ["evaporation", "evaporating", "salt from sea", "seawater", "vaporise"],
  crystallisation: ["crystallisation", "crystallization", "crystal", "saturated solution"],
  sublimation: ["sublimation", "sublime", "ammonium chloride", "camphor"],
  "magnet-separation": ["magnetic separation", "magnet", "iron filings"],
  "separating-funnel": ["separating funnel", "immiscible", "oil and water"],
  "molecular-pure-mixture": ["pure substance", "mixture", "particles", "impure"],
  "beaker-solution": ["solution", "solute", "solvent", "dissolve", "homogeneous"],
  "test-tubes": ["precipitate", "test tube", "double displacement"],
  distillation: ["distillation", "distil", "condenser", "boiling point"],
  sedimentation: ["sedimentation", "sediment", "settle", "settling"],
  decantation: ["decantation", "decant", "pour off"],
  handpicking: ["handpicking", "hand picking", "pick out"],
  winnowing: ["winnowing", "winnow", "husk", "chaff", "grain from stalk"],
  chromatography: ["chromatography", "chromatogram", "ink separation"],
  "solubility-curve": ["solubility", "soluble", "insoluble", "saturation"],
  "atom-bohr": ["atom", "bohr model", "electron shell", "orbit", "nucleus"],
  "ph-scale": ["ph scale", "acidic", "basic", "alkaline", "neutral", "indicator"],
  "field-lines-positive": ["positive charge", "field lines", "electric field of a positive"],
  "field-lines-negative": ["negative charge", "field lines into"],
  "electric-dipole": ["electric dipole", "dipole moment"],
  "coulomb-force": ["coulomb", "force between two charges", "electrostatic force"],
  "dipole-in-field": ["torque on a dipole", "dipole in a uniform"],
  "charging-induction": ["charging by induction", "induction", "electrostatic induction"],
  "gaussian-surface": ["gauss", "gaussian surface", "electric flux"],
  "uniform-field": ["uniform electric field", "parallel plates field"],
  "ray-diagram-lens": ["convex lens", "lens", "refraction of light", "image formation by lens"],
  "circuit-simple": ["electric circuit", "circuit diagram", "cell and bulb"],
  "bar-magnet-field": ["bar magnet", "magnetic field lines", "magnetic field of a magnet"],
  "concave-mirror": ["concave mirror", "reflection by concave"],
  "convex-mirror": ["convex mirror", "reflection by convex"],
  "prism-dispersion": ["prism", "dispersion", "spectrum", "vibgyor", "white light"],
  "human-eye": ["human eye", "retina", "cornea", "eye lens", "structure of the eye"],
  "em-induction": ["electromagnetic induction", "induced current", "faraday", "galvanometer"],
  "resistors-series": ["series combination", "resistors in series", "in series"],
  "resistors-parallel": ["parallel combination", "resistors in parallel", "in parallel"],
  solenoid: ["solenoid", "electromagnet"],
  capacitor: ["capacitor", "parallel plate", "capacitance"],
  transformer: ["transformer", "step up", "step down", "primary coil"],
  "cell-diagram": ["cell structure", "fundamental unit of life"],
  "plant-cell": ["plant cell", "cell wall", "chloroplast", "vacuole"],
  "animal-cell": ["animal cell"],
  neuron: ["neuron", "nerve cell", "axon", "dendrite"],
  photosynthesis: ["photosynthesis", "chlorophyll", "carbon dioxide and water"],
  "dna-helix": ["dna", "double helix", "nucleotide"],
  leaf: ["leaf", "stomata", "transpiration", "veins"],
  "xy-graph": ["graph", "plot", "versus", "variation of"],
  "right-triangle": ["right triangle", "pythagoras", "hypotenuse"],
  "circle-radius": ["circle", "radius", "circumference", "diameter"],
  "bar-graph": ["bar graph", "histogram", "column chart"],
  "coordinate-plane": ["coordinate", "cartesian plane", "quadrant", "abscissa", "ordinate"],
  "number-line": ["number line", "integers on a line"],
  "venn-diagram": ["venn", "set", "union", "intersection", "subset"],
};

// Precompute matching tokens per diagram (synonyms + id words).
const KEYWORDS: Record<string, string[]> = Object.fromEntries(
  Object.keys(CATALOG).map((id) => {
    const idWords = id.split(/[-_]/).filter((w) => w.length >= 4);
    const syn = SYNONYMS[id] ?? [];
    return [id, Array.from(new Set([...syn, ...idWords]))];
  }),
);

export function hasDiagram(id?: string | null): boolean {
  return !!id && !!CATALOG[id];
}

/**
 * Resolve the best diagram id for a section. A valid AI-provided id wins;
 * otherwise the section text is matched against curated synonyms.
 */
export function matchDiagram(text: string, aiId?: string | null): string | undefined {
  if (aiId && CATALOG[aiId]) return aiId;
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  let best: string | undefined;
  let bestScore = 0;
  for (const id of Object.keys(KEYWORDS)) {
    let score = 0;
    for (const kw of KEYWORDS[id]) {
      if (kw.length < 4) continue;
      if (t.includes(` ${kw} `) || t.includes(`${kw} `) || t.includes(kw)) {
        score = Math.max(score, kw.length + (kw.includes(" ") ? 4 : 0));
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return bestScore >= 6 ? best : undefined;
}

export function subjectOf(id: string): Subject {
  return SUBJECT[id] ?? "General";
}

export function diagramsBySubject(): Record<Subject, string[]> {
  const out: Record<Subject, string[]> = {
    Physics: [], Chemistry: [], Biology: [], Mathematics: [], General: [],
  };
  for (const id of Object.keys(CATALOG)) out[subjectOf(id)].push(id);
  return out;
}

// ── optional drop-in raster assets (assets/diagrams/<id>.png) ──
const ASSET_DIR = join(process.cwd(), "assets", "diagrams");

export function readPngAsset(id: string): Buffer | null {
  try {
    const p = join(ASSET_DIR, `${id}.png`);
    return existsSync(p) ? readFileSync(p) : null;
  } catch {
    return null;
  }
}
