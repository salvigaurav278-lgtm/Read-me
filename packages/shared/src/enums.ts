// Shared enums — mirror prisma/schema.prisma so web & api agree on values.

export const ClassLevel = {
  CLASS_10: "CLASS_10",
  CLASS_11: "CLASS_11",
  CLASS_12: "CLASS_12",
} as const;
export type ClassLevel = (typeof ClassLevel)[keyof typeof ClassLevel];

export const Subject = {
  MATHEMATICS: "MATHEMATICS",
  PHYSICS: "PHYSICS",
  CHEMISTRY: "CHEMISTRY",
  BIOLOGY: "BIOLOGY",
  ENGLISH: "ENGLISH",
  BUSINESS_STUDIES: "BUSINESS_STUDIES",
  ECONOMICS: "ECONOMICS",
  ACCOUNTANCY: "ACCOUNTANCY",
} as const;
export type Subject = (typeof Subject)[keyof typeof Subject];

export const ContentType = {
  NOTES: "NOTES",
  TEST: "TEST",
  WORKSHEET: "WORKSHEET",
  DPP: "DPP",
  PPT: "PPT",
  QUESTION_BANK: "QUESTION_BANK",
  ANSWER_KEY: "ANSWER_KEY",
  LESSON_PLAN: "LESSON_PLAN",
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const NoteStyle = {
  SHORT: "SHORT",
  DETAILED: "DETAILED",
  REVISION: "REVISION",
  ONE_SHOT: "ONE_SHOT",
  FORMULA_SHEET: "FORMULA_SHEET",
  MIND_MAP: "MIND_MAP",
} as const;
export type NoteStyle = (typeof NoteStyle)[keyof typeof NoteStyle];

export const TestKind = {
  CHAPTER_TEST: "CHAPTER_TEST",
  UNIT_TEST: "UNIT_TEST",
  FULL_SYLLABUS: "FULL_SYLLABUS",
  SAMPLE_PAPER: "SAMPLE_PAPER",
  BOARD_PATTERN: "BOARD_PATTERN",
  PRACTICE_WORKSHEET: "PRACTICE_WORKSHEET",
  DPP: "DPP",
} as const;
export type TestKind = (typeof TestKind)[keyof typeof TestKind];

export const QuestionType = {
  MCQ: "MCQ",
  CASE_STUDY: "CASE_STUDY",
  ASSERTION_REASON: "ASSERTION_REASON",
  SHORT_ANSWER: "SHORT_ANSWER",
  LONG_ANSWER: "LONG_ANSWER",
  COMPETENCY_BASED: "COMPETENCY_BASED",
  HOTS: "HOTS",
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const Difficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const PptTheme = {
  BLUE: "BLUE",
  GREEN: "GREEN",
  DARK: "DARK",
  MINIMAL: "MINIMAL",
  MODERN_EDUCATION: "MODERN_EDUCATION",
} as const;
export type PptTheme = (typeof PptTheme)[keyof typeof PptTheme];

export const ExportFormat = {
  PDF: "PDF",
  DOCX: "DOCX",
  PPTX: "PPTX",
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export const JobStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
