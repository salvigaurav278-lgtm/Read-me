// CBSE curriculum reference data (starter set).
// Seeded into the `Chapter` table in Phase 2 and expanded over time.

import { ClassLevel, Subject } from "./enums.js";

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

// Which subjects are offered for each class.
export const SUBJECTS_BY_CLASS: Record<ClassLevel, Subject[]> = {
  CLASS_10: [
    Subject.MATHEMATICS,
    Subject.PHYSICS,
    Subject.CHEMISTRY,
    Subject.BIOLOGY,
    Subject.ENGLISH,
    Subject.ECONOMICS,
  ],
  CLASS_11: [
    Subject.MATHEMATICS,
    Subject.PHYSICS,
    Subject.CHEMISTRY,
    Subject.BIOLOGY,
    Subject.ENGLISH,
    Subject.BUSINESS_STUDIES,
    Subject.ECONOMICS,
    Subject.ACCOUNTANCY,
  ],
  CLASS_12: [
    Subject.MATHEMATICS,
    Subject.PHYSICS,
    Subject.CHEMISTRY,
    Subject.BIOLOGY,
    Subject.ENGLISH,
    Subject.BUSINESS_STUDIES,
    Subject.ECONOMICS,
    Subject.ACCOUNTANCY,
  ],
};

export interface ChapterSeed {
  classLevel: ClassLevel;
  subject: Subject;
  number: number;
  name: string;
  unit?: string;
}

// Representative starter chapters (expanded during Phase 2 seeding).
export const CHAPTERS: ChapterSeed[] = [
  // Class 10 — Mathematics
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 1, name: "Real Numbers" },
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 2, name: "Polynomials" },
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 3, name: "Pair of Linear Equations in Two Variables" },
  { classLevel: "CLASS_10", subject: "MATHEMATICS", number: 8, name: "Introduction to Trigonometry" },

  // Class 10 — Physics (Science)
  { classLevel: "CLASS_10", subject: "PHYSICS", number: 10, name: "Light – Reflection and Refraction" },
  { classLevel: "CLASS_10", subject: "PHYSICS", number: 12, name: "Electricity" },

  // Class 11 — Physics
  { classLevel: "CLASS_11", subject: "PHYSICS", number: 5, name: "Laws of Motion", unit: "Laws of Motion" },
  { classLevel: "CLASS_11", subject: "PHYSICS", number: 8, name: "Mechanical Properties of Solids" },

  // Class 11 — Chemistry
  { classLevel: "CLASS_11", subject: "CHEMISTRY", number: 1, name: "Some Basic Concepts of Chemistry" },
  { classLevel: "CLASS_11", subject: "CHEMISTRY", number: 12, name: "Organic Chemistry – Some Basic Principles" },

  // Class 12 — Physics
  { classLevel: "CLASS_12", subject: "PHYSICS", number: 1, name: "Electric Charges and Fields" },
  { classLevel: "CLASS_12", subject: "PHYSICS", number: 4, name: "Moving Charges and Magnetism" },

  // Class 12 — Chemistry
  { classLevel: "CLASS_12", subject: "CHEMISTRY", number: 2, name: "Solutions" },

  // Class 12 — Accountancy
  { classLevel: "CLASS_12", subject: "ACCOUNTANCY", number: 1, name: "Accounting for Partnership Firms – Fundamentals" },

  // Class 12 — Business Studies
  { classLevel: "CLASS_12", subject: "BUSINESS_STUDIES", number: 1, name: "Nature and Significance of Management" },
];
