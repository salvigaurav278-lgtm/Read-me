// CBSE curriculum reference + enum mirrors.
// These string literals match the Prisma enums exactly, so they're safe to use
// in client components without importing the Prisma client.

export const CLASS_LEVELS = ["CLASS_10", "CLASS_11", "CLASS_12"] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const SUBJECTS = [
  "MATHEMATICS",
  "PHYSICS",
  "CHEMISTRY",
  "BIOLOGY",
  "ENGLISH",
  "BUSINESS_STUDIES",
  "ECONOMICS",
  "ACCOUNTANCY",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const CLASS_LABELS: Record<ClassLevel, string> = {
  CLASS_10: "Class 10",
  CLASS_11: "Class 11",
  CLASS_12: "Class 12",
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  MATHEMATICS: "Mathematics",
  PHYSICS: "Physics",
  CHEMISTRY: "Chemistry",
  BIOLOGY: "Biology",
  ENGLISH: "English",
  BUSINESS_STUDIES: "Business Studies",
  ECONOMICS: "Economics",
  ACCOUNTANCY: "Accountancy",
};

export const SUBJECTS_BY_CLASS: Record<ClassLevel, Subject[]> = {
  CLASS_10: [
    "MATHEMATICS",
    "PHYSICS",
    "CHEMISTRY",
    "BIOLOGY",
    "ENGLISH",
    "ECONOMICS",
  ],
  CLASS_11: [
    "MATHEMATICS",
    "PHYSICS",
    "CHEMISTRY",
    "BIOLOGY",
    "ENGLISH",
    "BUSINESS_STUDIES",
    "ECONOMICS",
    "ACCOUNTANCY",
  ],
  CLASS_12: [
    "MATHEMATICS",
    "PHYSICS",
    "CHEMISTRY",
    "BIOLOGY",
    "ENGLISH",
    "BUSINESS_STUDIES",
    "ECONOMICS",
    "ACCOUNTANCY",
  ],
};

export interface ChapterSeed {
  classLevel: ClassLevel;
  subject: Subject;
  number: number;
  name: string;
}

// Representative starter chapters (expanded over time). Seeded into the DB.
export const CHAPTERS: ChapterSeed[] = [
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 1, name: "Real Numbers" },
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 2, name: "Polynomials" },
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 3, name: "Pair of Linear Equations in Two Variables" },
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 4, name: "Quadratic Equations" },
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 8, name: "Introduction to Trigonometry" },
  { classLevel: "CLASS_10", subject: "PHYSICS", number: 10, name: "Light – Reflection and Refraction" },
  { classLevel: "CLASS_10", subject: "PHYSICS", number: 12, name: "Electricity" },
  { classLevel: "CLASS_10", subject: "CHEMISTRY", number: 1, name: "Chemical Reactions and Equations" },
  { classLevel: "CLASS_10", subject: "CHEMISTRY", number: 2, name: "Acids, Bases and Salts" },
  { classLevel: "CLASS_10", subject: "BIOLOGY", number: 6, name: "Life Processes" },
  { classLevel: "CLASS_10", subject: "ENGLISH", number: 1, name: "A Letter to God" },
  { classLevel: "CLASS_10", subject: "ECONOMICS", number: 1, name: "Development" },

  { classLevel: "CLASS_11", subject: "MATHEMATICS", number: 1, name: "Sets" },
  { classLevel: "CLASS_11", subject: "MATHEMATICS", number: 3, name: "Trigonometric Functions" },
  { classLevel: "CLASS_11", subject: "PHYSICS", number: 5, name: "Laws of Motion" },
  { classLevel: "CLASS_11", subject: "PHYSICS", number: 8, name: "Mechanical Properties of Solids" },
  { classLevel: "CLASS_11", subject: "CHEMISTRY", number: 1, name: "Some Basic Concepts of Chemistry" },
  { classLevel: "CLASS_11", subject: "CHEMISTRY", number: 12, name: "Organic Chemistry – Some Basic Principles" },
  { classLevel: "CLASS_11", subject: "BIOLOGY", number: 5, name: "Morphology of Flowering Plants" },
  { classLevel: "CLASS_11", subject: "ENGLISH", number: 1, name: "The Portrait of a Lady" },
  { classLevel: "CLASS_11", subject: "BUSINESS_STUDIES", number: 1, name: "Business, Trade and Commerce" },
  { classLevel: "CLASS_11", subject: "ECONOMICS", number: 1, name: "Introduction to Statistics" },
  { classLevel: "CLASS_11", subject: "ACCOUNTANCY", number: 1, name: "Introduction to Accounting" },

  { classLevel: "CLASS_12", subject: "MATHEMATICS", number: 1, name: "Relations and Functions" },
  { classLevel: "CLASS_12", subject: "MATHEMATICS", number: 4, name: "Determinants" },
  { classLevel: "CLASS_12", subject: "PHYSICS", number: 1, name: "Electric Charges and Fields" },
  { classLevel: "CLASS_12", subject: "PHYSICS", number: 4, name: "Moving Charges and Magnetism" },
  { classLevel: "CLASS_12", subject: "CHEMISTRY", number: 2, name: "Solutions" },
  { classLevel: "CLASS_12", subject: "CHEMISTRY", number: 4, name: "Chemical Kinetics" },
  { classLevel: "CLASS_12", subject: "BIOLOGY", number: 1, name: "Sexual Reproduction in Flowering Plants" },
  { classLevel: "CLASS_12", subject: "ENGLISH", number: 1, name: "The Last Lesson" },
  { classLevel: "CLASS_12", subject: "BUSINESS_STUDIES", number: 1, name: "Nature and Significance of Management" },
  { classLevel: "CLASS_12", subject: "ECONOMICS", number: 1, name: "Introduction to Macroeconomics" },
  { classLevel: "CLASS_12", subject: "ACCOUNTANCY", number: 1, name: "Accounting for Partnership Firms – Fundamentals" },
];
