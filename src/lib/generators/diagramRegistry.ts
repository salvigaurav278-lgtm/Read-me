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
  "ac-waveform": "Physics", "em-spectrum": "Physics", "young-double-slit": "Physics",
  "photoelectric-effect": "Physics", "pn-junction": "Physics",
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
  "ac-waveform": ["alternating current", "ac circuit", "rms", "reactance", "impedance"],
  "em-spectrum": ["electromagnetic waves", "electromagnetic spectrum", "em waves"],
  "young-double-slit": ["young's double slit", "interference", "diffraction", "fringes", "wave optics"],
  "photoelectric-effect": ["photoelectric effect", "work function", "photon", "dual nature"],
  "pn-junction": ["p-n junction", "pn junction", "diode", "semiconductor", "rectifier"],
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

// Broader CBSE concept dictionary for topics WITHOUT a built-in vector. These
// drive the hybrid pipeline: detection here + online fetch-and-cache fills the
// figure. Easily extended — add an entry (and optionally a vector later).
interface ConceptDef {
  synonyms: string[];
  subject: Subject;
  query: string;
}

const EXTRA_CONCEPTS: Record<string, ConceptDef> = {
  // Biology
  "human-heart": { synonyms: ["human heart", "heart", "circulatory system", "blood circulation", "ventricle", "atrium", "cardiac"], subject: "Biology", query: "human heart labelled diagram" },
  "human-brain": { synonyms: ["human brain", "brain", "cerebrum", "cerebellum", "medulla"], subject: "Biology", query: "human brain labelled diagram" },
  "human-ear": { synonyms: ["human ear", "ear structure", "cochlea", "eardrum", "auditory"], subject: "Biology", query: "human ear structure diagram" },
  "digestive-system": { synonyms: ["digestive system", "alimentary canal", "digestion", "stomach and intestine"], subject: "Biology", query: "human digestive system diagram" },
  "respiratory-system": { synonyms: ["respiratory system", "breathing", "lungs", "alveoli", "respiration"], subject: "Biology", query: "human respiratory system diagram" },
  "excretory-system": { synonyms: ["excretory system", "urinary system", "kidney", "nephron", "excretion"], subject: "Biology", query: "human excretory system diagram" },
  "nephron": { synonyms: ["nephron", "glomerulus", "bowman capsule"], subject: "Biology", query: "nephron structure diagram" },
  mitosis: { synonyms: ["mitosis", "cell division"], subject: "Biology", query: "mitosis stages diagram" },
  meiosis: { synonyms: ["meiosis", "reduction division"], subject: "Biology", query: "meiosis stages diagram" },
  "flower-structure": { synonyms: ["flower", "parts of a flower", "stamen", "pistil", "carpel"], subject: "Biology", query: "flower structure labelled diagram" },
  "reflex-arc": { synonyms: ["reflex arc", "reflex action", "spinal reflex"], subject: "Biology", query: "reflex arc diagram" },
  "food-chain": { synonyms: ["food chain", "food web", "trophic level"], subject: "Biology", query: "food chain diagram" },
  "root-structure": { synonyms: ["root", "root system", "root hair"], subject: "Biology", query: "root structure diagram" },
  "seed-structure": { synonyms: ["seed", "germination", "cotyledon"], subject: "Biology", query: "seed structure diagram" },
  // Chemistry
  "fractional-distillation": { synonyms: ["fractional distillation", "fractionating column", "petroleum refining"], subject: "Chemistry", query: "fractional distillation apparatus diagram" },
  electrolysis: { synonyms: ["electrolysis", "electrolytic cell", "electrode"], subject: "Chemistry", query: "electrolysis diagram" },
  "ionic-bond": { synonyms: ["ionic bond", "ionic bonding", "electron transfer", "sodium chloride bond"], subject: "Chemistry", query: "ionic bond formation diagram" },
  "covalent-bond": { synonyms: ["covalent bond", "covalent bonding", "shared electrons"], subject: "Chemistry", query: "covalent bond diagram" },
  "periodic-table": { synonyms: ["periodic table", "periodic classification", "groups and periods"], subject: "Chemistry", query: "periodic table blocks diagram" },
  "water-molecule": { synonyms: ["water molecule", "h2o structure"], subject: "Chemistry", query: "water molecule structure diagram" },
  "blast-furnace": { synonyms: ["blast furnace", "extraction of iron"], subject: "Chemistry", query: "blast furnace diagram" },
  "soap-micelle": { synonyms: ["micelle", "soap cleaning action", "detergent action"], subject: "Chemistry", query: "soap micelle diagram" },
  // Physics
  "electric-motor": { synonyms: ["electric motor", "dc motor", "motor working"], subject: "Physics", query: "electric motor diagram" },
  "electric-generator": { synonyms: ["electric generator", "dynamo", "ac generator", "dc generator"], subject: "Physics", query: "electric generator diagram" },
  "glass-slab-refraction": { synonyms: ["refraction through a glass slab", "lateral displacement", "glass slab"], subject: "Physics", query: "refraction through glass slab diagram" },
  "electromagnet": { synonyms: ["electromagnet", "magnetic field of a current"], subject: "Physics", query: "electromagnet diagram" },
  "domestic-circuit": { synonyms: ["domestic circuit", "house wiring", "electric fuse"], subject: "Physics", query: "domestic electric circuit diagram" },
  "force-on-conductor": { synonyms: ["force on a current carrying conductor", "fleming left hand"], subject: "Physics", query: "force on current carrying conductor diagram" },
  "wave-transverse": { synonyms: ["transverse wave", "wavelength", "crest and trough"], subject: "Physics", query: "transverse wave diagram" },
  "reflection-laws": { synonyms: ["laws of reflection", "angle of incidence", "angle of reflection"], subject: "Physics", query: "laws of reflection diagram" },
  // Mathematics
  "similar-triangles": { synonyms: ["similar triangles", "similarity of triangles"], subject: "Mathematics", query: "similar triangles diagram" },
  "trigonometry-triangle": { synonyms: ["trigonometry", "trigonometric ratios", "sine cosine tangent"], subject: "Mathematics", query: "trigonometry right triangle ratios diagram" },
  "circle-theorems": { synonyms: ["circle theorem", "tangent to a circle", "chord of a circle"], subject: "Mathematics", query: "circle tangent theorem diagram" },
  "linear-equation-graph": { synonyms: ["linear equations in two variables", "pair of linear equations", "straight line graph"], subject: "Mathematics", query: "linear equation graph two variables" },
  "quadratic-parabola": { synonyms: ["quadratic equation graph", "parabola"], subject: "Mathematics", query: "parabola quadratic graph" },
  "histogram": { synonyms: ["histogram", "frequency distribution", "class interval"], subject: "Mathematics", query: "histogram statistics diagram" },
  "pie-chart": { synonyms: ["pie chart", "pie graph", "sector graph"], subject: "Mathematics", query: "pie chart diagram" },
  "3d-solids": { synonyms: ["surface area and volume", "cylinder cone sphere", "solid shapes"], subject: "Mathematics", query: "3d solids cylinder cone sphere diagram" },
};

const EXTRA_KEYWORDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(EXTRA_CONCEPTS).map(([id, def]) => {
    const idWords = id.split(/[-_]/).filter((w) => w.length >= 4);
    return [id, Array.from(new Set([...def.synonyms, ...idWords]))];
  }),
);

export interface ConceptResolution {
  id: string;
  hasVector: boolean;
  query: string;
  subject: Subject;
}

function scoreKeywords(t: string, kws: string[]): number {
  let score = 0;
  for (const kw of kws) {
    if (kw.length < 4) continue;
    if (t.includes(kw)) score = Math.max(score, kw.length + (kw.includes(" ") ? 4 : 0));
  }
  return score;
}

/**
 * Resolve the best concept for a section across BOTH the vector library and
 * the broader concept dictionary. A valid AI id wins. `hasVector` says whether
 * a built-in diagram exists (else the hybrid pipeline may fetch an image).
 */
export function matchConcept(text: string, aiId?: string | null): ConceptResolution | undefined {
  if (aiId && CATALOG[aiId]) {
    return { id: aiId, hasVector: true, query: `${aiId.replace(/[-_]/g, " ")} diagram`, subject: subjectOf(aiId) };
  }
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  let best: ConceptResolution | undefined;
  let bestScore = 0;
  for (const id of Object.keys(KEYWORDS)) {
    const s = scoreKeywords(t, KEYWORDS[id]);
    if (s > bestScore) {
      bestScore = s;
      best = { id, hasVector: true, query: `${id.replace(/[-_]/g, " ")} diagram`, subject: subjectOf(id) };
    }
  }
  for (const id of Object.keys(EXTRA_KEYWORDS)) {
    const s = scoreKeywords(t, EXTRA_KEYWORDS[id]);
    if (s > bestScore) {
      bestScore = s;
      best = { id, hasVector: false, query: EXTRA_CONCEPTS[id].query, subject: EXTRA_CONCEPTS[id].subject };
    }
  }
  return bestScore >= 6 ? best : undefined;
}

export function subjectOf(id: string): Subject {
  return SUBJECT[id] ?? EXTRA_CONCEPTS[id]?.subject ?? "General";
}

function humanize(id: string): string {
  return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface ConceptInfo {
  id: string;
  subject: Subject;
  hasVector: boolean;
  label: string;
  synonyms: string[];
}

/** Every known concept (built-in vectors + fetch-only dictionary). */
export function allConcepts(): ConceptInfo[] {
  const out: ConceptInfo[] = [];
  for (const id of Object.keys(CATALOG)) {
    out.push({ id, subject: subjectOf(id), hasVector: true, label: humanize(id), synonyms: KEYWORDS[id] ?? [] });
  }
  for (const id of Object.keys(EXTRA_CONCEPTS)) {
    out.push({ id, subject: EXTRA_CONCEPTS[id].subject, hasVector: false, label: humanize(id), synonyms: EXTRA_CONCEPTS[id].synonyms });
  }
  return out.sort((a, b) => a.subject.localeCompare(b.subject) || a.label.localeCompare(b.label));
}

export function conceptExists(id: string): boolean {
  return !!CATALOG[id] || !!EXTRA_CONCEPTS[id];
}

export function conceptQuery(id: string): string {
  if (EXTRA_CONCEPTS[id]) return EXTRA_CONCEPTS[id].query;
  return `${id.replace(/[-_]/g, " ")} diagram`;
}

export function conceptInfo(id: string): ConceptInfo | undefined {
  return allConcepts().find((c) => c.id === id);
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
