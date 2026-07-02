// CBSE chapter → concept mapping (default library).
//
// Each chapter maps to the important concepts (which reference diagram ids in
// the diagram registry), plus keywords, formulas and experiments. This drives
// automatic diagram/table/formula attachment during generation. Admins can
// override/extend these at runtime (see mappingStore.ts) — this file is just
// the code-shipped baseline. Keep it modular: add/adjust entries freely.

export interface ChapterMapping {
  key: string; // stable id: `${classLevel}::${subject}::${normalizeChapter(chapter)}`
  classLevel: string; // e.g. "CLASS_10" (supports 6–12 as free strings)
  subject: string; // e.g. "PHYSICS" | "SCIENCE" | "MATHEMATICS"
  chapter: string; // display name
  synonyms: string[]; // alternate chapter names / topic phrasings
  concepts: string[]; // diagram/registry concept ids
  keywords: string[];
  formulas: string[];
  experiments: string[];
}

export function normalizeChapter(name: string): string {
  return (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function chapterKey(classLevel: string, subject: string, chapter: string): string {
  return `${classLevel}::${subject}::${normalizeChapter(chapter)}`;
}

type Seed = Omit<ChapterMapping, "key" | "synonyms" | "keywords" | "formulas" | "experiments"> &
  Partial<Pick<ChapterMapping, "synonyms" | "keywords" | "formulas" | "experiments">>;

function m(s: Seed): ChapterMapping {
  return {
    key: chapterKey(s.classLevel, s.subject, s.chapter),
    classLevel: s.classLevel,
    subject: s.subject,
    chapter: s.chapter,
    synonyms: s.synonyms ?? [],
    concepts: s.concepts,
    keywords: s.keywords ?? [],
    formulas: s.formulas ?? [],
    experiments: s.experiments ?? [],
  };
}

export const DEFAULT_MAPPINGS: ChapterMapping[] = [
  // ── Class 10 · Physics ──
  m({
    classLevel: "CLASS_10", subject: "PHYSICS", chapter: "Light – Reflection and Refraction",
    synonyms: ["light reflection and refraction", "reflection and refraction of light", "reflection of light", "refraction of light"],
    concepts: ["concave-mirror", "convex-mirror", "ray-diagram-lens", "reflection-laws", "glass-slab-refraction", "prism-dispersion"],
    keywords: ["mirror", "lens", "focal length", "refractive index", "real image", "virtual image"],
    formulas: ["1/v − 1/u = 1/f", "m = −v/u", "n = c/v", "n₁ sinθ₁ = n₂ sinθ₂"],
    experiments: ["Image formation by a concave mirror", "Refraction through a glass slab"],
  }),
  m({
    classLevel: "CLASS_10", subject: "PHYSICS", chapter: "Electricity",
    synonyms: ["current electricity", "electric current", "current flow", "electric circuits"],
    concepts: ["circuit-simple", "resistors-series", "resistors-parallel", "xy-graph"],
    keywords: ["current", "voltage", "resistance", "ohm's law", "power"],
    formulas: ["V = IR", "P = VI", "R = ρl/A", "1/Rp = 1/R₁ + 1/R₂"],
    experiments: ["Verification of Ohm's law", "Resistors in series and parallel"],
  }),
  m({
    classLevel: "CLASS_10", subject: "PHYSICS", chapter: "Magnetic Effects of Electric Current",
    synonyms: ["magnetism", "electromagnetism", "magnetic field"],
    concepts: ["bar-magnet-field", "solenoid", "electromagnet", "force-on-conductor", "electric-generator"],
    keywords: ["magnetic field", "field lines", "solenoid", "fleming's rule", "induction"],
    formulas: [],
    experiments: ["Magnetic field lines of a bar magnet", "Field due to a current-carrying solenoid"],
  }),
  // ── Class 10 · Chemistry ──
  m({
    classLevel: "CLASS_10", subject: "CHEMISTRY", chapter: "Chemical Reactions and Equations",
    synonyms: ["chemical reactions", "balancing equations", "types of reactions"],
    concepts: ["test-tubes"],
    keywords: ["oxidation", "reduction", "precipitate", "displacement", "combination"],
    formulas: [], experiments: ["Displacement reaction of iron with copper sulphate"],
  }),
  m({
    classLevel: "CLASS_10", subject: "CHEMISTRY", chapter: "Acids, Bases and Salts",
    synonyms: ["acids bases and salts", "ph", "indicators"],
    concepts: ["ph-scale", "test-tubes"],
    keywords: ["acid", "base", "salt", "ph", "neutralisation", "indicator"],
    formulas: ["pH = −log[H⁺]"], experiments: ["Testing acids and bases with indicators"],
  }),
  // ── Class 10 · Biology ──
  m({
    classLevel: "CLASS_10", subject: "BIOLOGY", chapter: "Life Processes",
    synonyms: ["nutrition respiration transportation excretion", "digestion", "circulation"],
    concepts: ["digestive-system", "respiratory-system", "human-heart", "excretory-system", "nephron", "photosynthesis"],
    keywords: ["nutrition", "respiration", "transportation", "excretion", "photosynthesis"],
    formulas: [], experiments: ["Setup showing CO₂ is released during respiration"],
  }),
  m({
    classLevel: "CLASS_10", subject: "BIOLOGY", chapter: "Control and Coordination",
    synonyms: ["nervous system", "reflex action", "hormones"],
    concepts: ["neuron", "reflex-arc", "human-brain"],
    keywords: ["neuron", "reflex arc", "hormone", "nervous system"],
    formulas: [], experiments: [],
  }),
  // ── Class 10 · Mathematics ──
  m({ classLevel: "CLASS_10", subject: "MATHEMATICS", chapter: "Pair of Linear Equations in Two Variables",
    synonyms: ["linear equations", "simultaneous equations"], concepts: ["linear-equation-graph", "coordinate-plane"],
    keywords: ["consistent", "inconsistent", "substitution", "elimination"], formulas: ["a₁/a₂ ≠ b₁/b₂"], experiments: [] }),
  m({ classLevel: "CLASS_10", subject: "MATHEMATICS", chapter: "Quadratic Equations",
    synonyms: ["quadratic"], concepts: ["quadratic-parabola", "xy-graph"], keywords: ["roots", "discriminant"],
    formulas: ["x = (−b ± √(b²−4ac))/2a", "D = b²−4ac"], experiments: [] }),
  m({ classLevel: "CLASS_10", subject: "MATHEMATICS", chapter: "Triangles",
    synonyms: ["similar triangles", "similarity"], concepts: ["similar-triangles", "right-triangle"],
    keywords: ["similarity", "congruence", "basic proportionality"], formulas: ["BPT: AD/DB = AE/EC"], experiments: [] }),
  m({ classLevel: "CLASS_10", subject: "MATHEMATICS", chapter: "Circles",
    synonyms: ["tangent to a circle"], concepts: ["circle-theorems", "circle-radius"],
    keywords: ["tangent", "chord", "secant"], formulas: [], experiments: [] }),
  m({ classLevel: "CLASS_10", subject: "MATHEMATICS", chapter: "Introduction to Trigonometry",
    synonyms: ["trigonometry", "trigonometric ratios"], concepts: ["trigonometry-triangle", "right-triangle"],
    keywords: ["sine", "cosine", "tangent"], formulas: ["sin²θ + cos²θ = 1"], experiments: [] }),
  m({ classLevel: "CLASS_10", subject: "MATHEMATICS", chapter: "Statistics",
    synonyms: ["mean median mode", "data handling"], concepts: ["histogram", "bar-graph"],
    keywords: ["mean", "median", "mode", "frequency"], formulas: ["Mean = Σfᵢxᵢ/Σfᵢ"], experiments: [] }),

  // ── Class 12 · Physics ──
  m({
    classLevel: "CLASS_12", subject: "PHYSICS", chapter: "Electric Charges and Fields",
    synonyms: ["electrostatics", "electric field", "coulomb's law", "gauss law"],
    concepts: ["field-lines-positive", "field-lines-negative", "electric-dipole", "coulomb-force", "dipole-in-field", "charging-induction", "gaussian-surface", "uniform-field"],
    keywords: ["charge", "field", "flux", "dipole", "induction"],
    formulas: ["F = kq₁q₂/r²", "E = F/q₀", "Φ = q/ε₀", "τ = pE sinθ"], experiments: [],
  }),
  m({
    classLevel: "CLASS_12", subject: "PHYSICS", chapter: "Moving Charges and Magnetism",
    synonyms: ["magnetism", "magnetic force", "solenoid"],
    concepts: ["solenoid", "electromagnet", "force-on-conductor", "bar-magnet-field"],
    keywords: ["lorentz force", "biot savart", "ampere's law"], formulas: ["F = qvB sinθ", "F = BIL sinθ"], experiments: [],
  }),
  // ── Class 12 · Chemistry ──
  m({ classLevel: "CLASS_12", subject: "CHEMISTRY", chapter: "Solutions",
    synonyms: ["solution", "concentration", "colligative properties"], concepts: ["beaker-solution", "solubility-curve"],
    keywords: ["molarity", "molality", "solubility"], formulas: ["Molarity = moles/L", "ΔTb = Kb·m"], experiments: [] }),
  // ── Class 12 · Biology ──
  m({ classLevel: "CLASS_12", subject: "BIOLOGY", chapter: "Sexual Reproduction in Flowering Plants",
    synonyms: ["flower reproduction", "pollination"], concepts: ["flower-structure"],
    keywords: ["pollination", "fertilisation", "double fertilisation"], formulas: [], experiments: [] }),
  m({ classLevel: "CLASS_12", subject: "BIOLOGY", chapter: "Molecular Basis of Inheritance",
    synonyms: ["dna", "genetics", "heredity"], concepts: ["dna-helix"],
    keywords: ["dna", "rna", "replication", "transcription"], formulas: [], experiments: [] }),

  // ── Classes 6–9 · Science (future-facing examples; app currently exposes 10–12) ──
  m({ classLevel: "CLASS_6", subject: "SCIENCE", chapter: "Separation of Substances",
    synonyms: ["separation techniques", "methods of separation"],
    concepts: ["handpicking", "winnowing", "sedimentation", "decantation", "filtration", "evaporation"],
    keywords: ["handpicking", "winnowing", "threshing", "sieving", "filtration"], formulas: [], experiments: ["Separating sand and salt from a mixture"] }),
  m({ classLevel: "CLASS_9", subject: "SCIENCE", chapter: "Is Matter Around Us Pure",
    synonyms: ["matter around us pure", "mixtures and solutions", "pure substances"],
    concepts: ["molecular-pure-mixture", "filtration", "evaporation", "crystallisation", "sublimation", "magnet-separation", "chromatography", "beaker-solution"],
    keywords: ["mixture", "solution", "colloid", "suspension", "separation"], formulas: [], experiments: ["Separating components of a mixture of salt, sand and iron filings"] }),
  m({ classLevel: "CLASS_9", subject: "SCIENCE", chapter: "The Fundamental Unit of Life",
    synonyms: ["cell", "cell structure"], concepts: ["plant-cell", "animal-cell", "cell-diagram"],
    keywords: ["cell", "nucleus", "organelle", "membrane"], formulas: [], experiments: ["Observing onion peel cells under a microscope"] }),
];
