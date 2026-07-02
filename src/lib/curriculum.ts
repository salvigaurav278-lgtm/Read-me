// CBSE curriculum reference + enum mirrors.
// These string literals match the Prisma enums exactly, so they're safe to use
// in client components without importing the Prisma client.

export const CLASS_LEVELS = [
  "CLASS_6",
  "CLASS_7",
  "CLASS_8",
  "CLASS_9",
  "CLASS_10",
  "CLASS_11",
  "CLASS_12",
] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const SUBJECTS = [
  "MATHEMATICS",
  "SCIENCE",
  "PHYSICS",
  "CHEMISTRY",
  "BIOLOGY",
  "SOCIAL_SCIENCE",
  "ENGLISH",
  "HINDI",
  "SANSKRIT",
  "COMPUTER_SCIENCE",
  "BUSINESS_STUDIES",
  "ECONOMICS",
  "ACCOUNTANCY",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const CLASS_LABELS: Record<ClassLevel, string> = {
  CLASS_6: "Class 6",
  CLASS_7: "Class 7",
  CLASS_8: "Class 8",
  CLASS_9: "Class 9",
  CLASS_10: "Class 10",
  CLASS_11: "Class 11",
  CLASS_12: "Class 12",
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  MATHEMATICS: "Mathematics",
  SCIENCE: "Science",
  PHYSICS: "Physics",
  CHEMISTRY: "Chemistry",
  BIOLOGY: "Biology",
  SOCIAL_SCIENCE: "Social Science",
  ENGLISH: "English",
  HINDI: "Hindi",
  SANSKRIT: "Sanskrit",
  COMPUTER_SCIENCE: "Computer Science",
  BUSINESS_STUDIES: "Business Studies",
  ECONOMICS: "Economics",
  ACCOUNTANCY: "Accountancy",
};

// Middle school (6–10) study integrated Science & Social Science; senior
// secondary (11–12) split into streams.
const MIDDLE: Subject[] = ["MATHEMATICS", "SCIENCE", "SOCIAL_SCIENCE", "ENGLISH", "HINDI", "SANSKRIT", "COMPUTER_SCIENCE"];
const SENIOR: Subject[] = [
  "MATHEMATICS", "PHYSICS", "CHEMISTRY", "BIOLOGY", "COMPUTER_SCIENCE",
  "ENGLISH", "HINDI", "BUSINESS_STUDIES", "ECONOMICS", "ACCOUNTANCY",
];

export const SUBJECTS_BY_CLASS: Record<ClassLevel, Subject[]> = {
  CLASS_6: MIDDLE,
  CLASS_7: MIDDLE,
  CLASS_8: MIDDLE,
  CLASS_9: MIDDLE,
  CLASS_10: ["MATHEMATICS", "SCIENCE", "PHYSICS", "CHEMISTRY", "BIOLOGY", "SOCIAL_SCIENCE", "ENGLISH", "HINDI", "COMPUTER_SCIENCE", "ECONOMICS"],
  CLASS_11: SENIOR,
  CLASS_12: SENIOR,
};

export interface ChapterSeed {
  classLevel: ClassLevel;
  subject: Subject;
  number: number;
  name: string;
}

// CBSE/NCERT chapters across Classes 6–12. Auto-numbered per (class, subject)
// group so numbers are always unique. This is a comprehensive-but-extensible
// baseline; add rows freely (order = chapter number). Seeded into the DB and
// surfaced by the generator's chapter picker.
function chs(classLevel: ClassLevel, subject: Subject, names: string[]): ChapterSeed[] {
  return names.map((name, i) => ({ classLevel, subject, number: i + 1, name }));
}

export const CHAPTERS: ChapterSeed[] = [
  // ── Class 6 ──
  ...chs("CLASS_6", "SCIENCE", [
    "Food: Where Does It Come From?", "Components of Food", "Fibre to Fabric", "Sorting Materials into Groups",
    "Separation of Substances", "Changes Around Us", "Getting to Know Plants", "Body Movements",
    "The Living Organisms and Their Surroundings", "Motion and Measurement of Distances",
    "Light, Shadows and Reflections", "Electricity and Circuits", "Fun with Magnets", "Water", "Air Around Us",
  ]),
  ...chs("CLASS_6", "MATHEMATICS", [
    "Knowing Our Numbers", "Whole Numbers", "Playing with Numbers", "Basic Geometrical Ideas",
    "Understanding Elementary Shapes", "Integers", "Fractions", "Decimals", "Data Handling",
    "Mensuration", "Algebra", "Ratio and Proportion", "Symmetry", "Practical Geometry",
  ]),
  ...chs("CLASS_6", "SOCIAL_SCIENCE", ["What, Where, How and When?", "The Earth in the Solar System", "Understanding Diversity", "Maps"]),

  // ── Class 7 ──
  ...chs("CLASS_7", "SCIENCE", [
    "Nutrition in Plants", "Nutrition in Animals", "Heat", "Acids, Bases and Salts",
    "Physical and Chemical Changes", "Respiration in Organisms", "Transportation in Animals and Plants",
    "Reproduction in Plants", "Motion and Time", "Electric Current and Its Effects", "Light",
    "Forests: Our Lifeline", "Wastewater Story",
  ]),
  ...chs("CLASS_7", "MATHEMATICS", [
    "Integers", "Fractions and Decimals", "Data Handling", "Simple Equations", "Lines and Angles",
    "The Triangle and Its Properties", "Comparing Quantities", "Rational Numbers", "Perimeter and Area",
    "Algebraic Expressions", "Exponents and Powers", "Symmetry", "Visualising Solid Shapes",
  ]),

  // ── Class 8 ──
  ...chs("CLASS_8", "SCIENCE", [
    "Crop Production and Management", "Microorganisms: Friend and Foe", "Coal and Petroleum",
    "Combustion and Flame", "Conservation of Plants and Animals", "Reproduction in Animals",
    "Cell — Structure and Functions", "Force and Pressure", "Friction", "Sound",
    "Chemical Effects of Electric Current", "Some Natural Phenomena", "Light",
  ]),
  ...chs("CLASS_8", "MATHEMATICS", [
    "Rational Numbers", "Linear Equations in One Variable", "Understanding Quadrilaterals",
    "Data Handling", "Squares and Square Roots", "Cubes and Cube Roots", "Comparing Quantities",
    "Algebraic Expressions and Identities", "Mensuration", "Exponents and Powers",
    "Direct and Inverse Proportions", "Factorisation", "Introduction to Graphs",
  ]),

  // ── Class 9 ──
  ...chs("CLASS_9", "SCIENCE", [
    "Matter in Our Surroundings", "Is Matter Around Us Pure", "Atoms and Molecules", "Structure of the Atom",
    "The Fundamental Unit of Life", "Tissues", "Motion", "Force and Laws of Motion", "Gravitation",
    "Work and Energy", "Sound", "Improvement in Food Resources",
  ]),
  ...chs("CLASS_9", "MATHEMATICS", [
    "Number Systems", "Polynomials", "Coordinate Geometry", "Linear Equations in Two Variables",
    "Introduction to Euclid's Geometry", "Lines and Angles", "Triangles", "Quadrilaterals", "Circles",
    "Heron's Formula", "Surface Areas and Volumes", "Statistics",
  ]),

  // ── Class 10 ──
  ...chs("CLASS_10", "MATHEMATICS", [
    "Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", "Quadratic Equations",
    "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry",
    "Some Applications of Trigonometry", "Circles", "Areas Related to Circles", "Surface Areas and Volumes",
    "Statistics", "Probability",
  ]),
  ...chs("CLASS_10", "PHYSICS", [
    "Light – Reflection and Refraction", "The Human Eye and the Colourful World", "Electricity",
    "Magnetic Effects of Electric Current",
  ]),
  ...chs("CLASS_10", "CHEMISTRY", [
    "Chemical Reactions and Equations", "Acids, Bases and Salts", "Metals and Non-metals",
    "Carbon and Its Compounds",
  ]),
  ...chs("CLASS_10", "BIOLOGY", [
    "Life Processes", "Control and Coordination", "How Do Organisms Reproduce?",
    "Heredity and Evolution", "Our Environment",
  ]),
  ...chs("CLASS_10", "SOCIAL_SCIENCE", ["The Rise of Nationalism in Europe", "Resources and Development", "Power Sharing", "Development"]),
  ...chs("CLASS_10", "ENGLISH", ["A Letter to God", "Nelson Mandela: Long Walk to Freedom", "The Ball Poem"]),
  ...chs("CLASS_10", "COMPUTER_SCIENCE", ["Computer Networking Basics", "HTML Basics", "Cyber Safety"]),

  // ── Class 11 ──
  ...chs("CLASS_11", "MATHEMATICS", [
    "Sets", "Relations and Functions", "Trigonometric Functions", "Complex Numbers and Quadratic Equations",
    "Linear Inequalities", "Permutations and Combinations", "Binomial Theorem", "Sequences and Series",
    "Straight Lines", "Conic Sections", "Introduction to Three Dimensional Geometry", "Limits and Derivatives",
    "Statistics", "Probability",
  ]),
  ...chs("CLASS_11", "PHYSICS", [
    "Units and Measurements", "Motion in a Straight Line", "Motion in a Plane", "Laws of Motion",
    "Work, Energy and Power", "System of Particles and Rotational Motion", "Gravitation",
    "Mechanical Properties of Solids", "Mechanical Properties of Fluids", "Thermal Properties of Matter",
    "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves",
  ]),
  ...chs("CLASS_11", "CHEMISTRY", [
    "Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity",
    "Chemical Bonding and Molecular Structure", "Thermodynamics", "Equilibrium", "Redox Reactions",
    "Organic Chemistry – Some Basic Principles and Techniques", "Hydrocarbons",
  ]),
  ...chs("CLASS_11", "BIOLOGY", [
    "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
    "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Cell: The Unit of Life", "Biomolecules",
    "Photosynthesis in Higher Plants", "Respiration in Plants", "Body Fluids and Circulation",
    "Neural Control and Coordination",
  ]),
  ...chs("CLASS_11", "COMPUTER_SCIENCE", ["Getting Started with Python", "Data Handling", "Flow of Control", "Functions"]),
  ...chs("CLASS_11", "ENGLISH", ["The Portrait of a Lady", "We're Not Afraid to Die..."]),
  ...chs("CLASS_11", "BUSINESS_STUDIES", ["Business, Trade and Commerce", "Forms of Business Organisation"]),
  ...chs("CLASS_11", "ECONOMICS", ["Introduction to Statistics", "Collection of Data", "Indian Economy on the Eve of Independence"]),
  ...chs("CLASS_11", "ACCOUNTANCY", ["Introduction to Accounting", "Theory Base of Accounting", "Recording of Transactions"]),

  // ── Class 12 ──
  ...chs("CLASS_12", "MATHEMATICS", [
    "Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants",
    "Continuity and Differentiability", "Application of Derivatives", "Integrals", "Application of Integrals",
    "Differential Equations", "Vector Algebra", "Three Dimensional Geometry", "Linear Programming", "Probability",
  ]),
  ...chs("CLASS_12", "PHYSICS", [
    "Electric Charges and Fields", "Electrostatic Potential and Capacitance", "Current Electricity",
    "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction", "Alternating Current",
    "Electromagnetic Waves", "Ray Optics and Optical Instruments", "Wave Optics",
    "Dual Nature of Radiation and Matter", "Atoms", "Nuclei", "Semiconductor Electronics",
  ]),
  ...chs("CLASS_12", "CHEMISTRY", [
    "Solutions", "Electrochemistry", "Chemical Kinetics", "The d- and f-Block Elements",
    "Coordination Compounds", "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers",
    "Aldehydes, Ketones and Carboxylic Acids", "Amines", "Biomolecules",
  ]),
  ...chs("CLASS_12", "BIOLOGY", [
    "Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health",
    "Principles of Inheritance and Variation", "Molecular Basis of Inheritance", "Evolution",
    "Human Health and Disease", "Microbes in Human Welfare", "Biotechnology: Principles and Processes",
    "Organisms and Populations", "Ecosystem", "Biodiversity and Conservation",
  ]),
  ...chs("CLASS_12", "COMPUTER_SCIENCE", ["Python Revision", "Data Structures: Stacks and Queues", "Database Concepts and SQL", "Computer Networks"]),
  ...chs("CLASS_12", "ENGLISH", ["The Last Lesson", "Lost Spring", "Deep Water"]),
  ...chs("CLASS_12", "BUSINESS_STUDIES", ["Nature and Significance of Management", "Principles of Management", "Business Environment"]),
  ...chs("CLASS_12", "ECONOMICS", ["Introduction to Macroeconomics", "National Income Accounting", "Money and Banking"]),
  ...chs("CLASS_12", "ACCOUNTANCY", ["Accounting for Partnership Firms – Fundamentals", "Reconstitution of a Partnership Firm: Admission", "Accounting for Share Capital"]),
];
