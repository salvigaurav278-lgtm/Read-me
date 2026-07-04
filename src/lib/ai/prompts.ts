import type { ContentType } from "@/lib/content-types";
import {
  CLASS_LABELS,
  SUBJECT_LABELS,
  type ClassLevel,
  type Subject,
} from "@/lib/curriculum";
import { shapeForType, type ContentShape } from "./schemas";
import { DIAGRAM_CATALOG_LINES } from "@/lib/generators/diagrams";
import type { ChapterMapping } from "@/lib/curriculum/chapterConcepts";

export interface PromptInput {
  type: ContentType;
  classLevel: ClassLevel;
  subject: Subject;
  chapter?: string | null;
  topic?: string | null;
  params: Record<string, unknown>;
}

const SHAPE_CONTRACT: Record<ContentShape, string> = {
  document: `{
  "kind": "document",
  "title": string,
  "subtitle"?: string,
  "sections": [ { "heading": string, "body": [string], "example"?: string, "formulas"?: [ { "name": string, "expression": string } ], "keyPoints"?: [string], "table"?: { "headers": [string], "rows": [[string]] }, "diagramId"?: string, "diagram"?: string, "tip"?: string, "mistake"?: string } ],
  "keyPoints"?: [string],
  "tips"?: [string],
  "commonMistakes"?: [string],
  "keyTakeaways"?: [string],
  "quote"?: string,
  "summary"?: [string],
  "pyqs"?: [ { "question": string, "answer"?: string, "year"?: string } ]
}`,
  paper: `{
  "kind": "paper",
  "title": string,
  "instructions"?: [string],
  "totalMarks"?: number,
  "durationMin"?: number,
  "questions": [ { "number": number, "text": string, "type": "MCQ"|"SHORT_ANSWER"|"LONG_ANSWER"|"CASE_STUDY"|"ASSERTION_REASON"|"HOTS"|"COMPETENCY", "marks": number, "options"?: [string], "answer"?: string, "solution"?: [string] } ]
}`,
  deck: `{
  "kind": "deck",
  "title": string,
  "theme": string,
  "slides": [ { "title": string, "bullets"?: [string], "notes"?: string } ]
}`,
};

/** Normalise the note-style value from the form/params. */
export function normalizeNoteStyle(style?: unknown): "SHORT" | "DETAILED" | "REVISION" | "ONE_SHOT" | "FORMULA_SHEET" {
  const s = String(style ?? "DETAILED").toUpperCase().replace(/[\s-]+/g, "_");
  if (s === "SHORT") return "SHORT";
  if (s === "REVISION") return "REVISION";
  if (s === "ONE_SHOT" || s === "ONESHOT") return "ONE_SHOT";
  if (s === "FORMULA_SHEET" || s === "FORMULA") return "FORMULA_SHEET";
  return "DETAILED";
}

/** Short/Revision/Formula-Sheet styles are text-only (no auto-diagrams). */
export function noteStyleAllowsDiagrams(style?: unknown): boolean {
  const s = normalizeNoteStyle(style);
  return s === "DETAILED" || s === "ONE_SHOT";
}

const DIAGRAM_OPTIONS = `Choose "diagramId" ONLY when a diagram below genuinely depicts a section's concept; copy the id EXACTLY, else OMIT it — never force an unrelated diagram. Options (id — what it shows):
${DIAGRAM_CATALOG_LINES.map((l) => `    * ${l}`).join("\n")}`;

/** Each note style produces a distinct structure, length and formatting. */
function notesInstruction(input: PromptInput): string {
  const style = normalizeNoteStyle(input.params.style);
  switch (style) {
    case "SHORT":
      return `Produce SHORT NOTES for a quick 2–5 minute study (fits ~2–3 pages). Set "subtitle": "Short Notes • CBSE". Use 8–14 compact "sections"; each section has a short "heading" and 2–4 very short "body" bullets — short definitions and the single most important facts only. Include only the most important concepts. Do NOT write long explanations, theory, worked examples, tables, tips, mistakes, PYQs or diagrams. Only include a "formulas" entry when a formula is absolutely core (name + expression). At document level add a short "keyPoints" list (the 5–7 most important takeaways). Omit "tips", "commonMistakes", "keyTakeaways", "quote", "pyqs".`;

    case "REVISION":
      return `Produce REVISION NOTES for last-minute exam prep. Set "subtitle": "Revision Notes • CBSE". Create one "section" per MAJOR topic (about 6–12), each roughly one page of crisp, exam-important bullet "body" points only (no lengthy explanations). For each topic: highlight key "formulas" (name + expression) and add a "tip" containing a trick or mnemonic. Do NOT add long theory, examples, tables or diagrams. At document level provide "pyqs" as Frequently Asked Questions (question + short answer + year) and a short "keyTakeaways" list. Omit "quote".`;

    case "ONE_SHOT":
      return `Produce ONE-SHOT NOTES assuming the student has only ONE hour before the exam. Set "subtitle": "One-Shot Notes • CBSE". Cover the COMPLETE chapter: one "section" per topic explained BRIEFLY (2–4 bullet "body" points each). For key topics add important "formulas", one short worked "example", and a "diagramId" where a figure truly helps. At document level include "pyqs" (important PYQ concepts) and "commonMistakes". Add a final section with "heading": "Quick Recap" whose body summarises the whole chapter, and also fill the document "summary". Keep it fast and complete, not verbose.
${DIAGRAM_OPTIONS}`;

    case "FORMULA_SHEET":
      return `Produce ONLY a FORMULA SHEET — no explanations, no paragraphs, no theory, no examples. Set "subtitle": "Formula Sheet • CBSE". Output "sections" grouped BY TOPIC: each section's "heading" is the topic name, its "body" MUST be an empty array [], and its "formulas" lists EVERY important formula for that topic as { "name", "expression" } using proper mathematical notation (e.g. v = u + at, x = (−b ± √(b²−4ac))/2a). In "name" append the meaning of variables in parentheses where helpful (e.g. "Kinetic Energy (m = mass, v = speed)"). Do NOT include "example", "table", "diagramId", "tip", "mistake", "keyPoints", "tips", "commonMistakes", "keyTakeaways", "quote", "summary" or "pyqs". Keep it compact enough to print on 1–2 pages.`;

    case "DETAILED":
    default:
      return `Produce DETAILED, comprehensive classroom notes suitable for first-time learning, laid out like a printed coaching-institute handout (Allen / Physics Wallah quality). Set "subtitle": "Detailed Notes • CBSE". Break the chapter into 12–24 compact, numbered "sections" — each a small self-contained card with a "heading" and 2–4 concise "body" bullets that explain the concept step by step (include definitions and theory). For each section, where relevant also add:
- "example": one short real-life or worked NCERT-style example (rendered as an "Example:" line);
- "formulas" (name + expression);
- a small "table" with "headers" and "rows" for comparisons/classifications (2–3 columns, short cells);
- "diagramId" where a figure helps (see the list below);
- a one-line teaching "tip" and a common "mistake" (use sparingly).
At the document level also provide: overall "keyPoints", "tips", "commonMistakes", a short "keyTakeaways" checklist (3–5 items), a memorable one-line "quote", a "summary", and "pyqs" (a few CBSE previous-year questions with "question", "answer" and "year"). Prefer many short cards with examples and diagrams over a few long ones.
${DIAGRAM_OPTIONS}`;
  }
}

function instructionsForType(input: PromptInput): string {
  const p = input.params;
  switch (input.type) {
    case "NOTES":
      return notesInstruction(input);
    case "MIND_MAP":
      return `Produce a mind-map with ${p.branches ?? 6} main branches. Each "section" is a main branch: "heading" is a SHORT branch name (1-3 words) and "body" is 3-4 sub-nodes. Every sub-node must be a concise keyword phrase of at most 5 words — no full sentences, no examples, no parenthetical explanations. Keep every label short so it fits inside a small node.`;
    case "LESSON_PLAN":
      return `Produce a lesson plan spanning ${p.periods ?? 3} periods. Use sections titled exactly: "Learning Objectives", "Teaching Strategy", "Activities", "Assessment", "Homework", "Expected Learning Outcomes". Put items as bullet points in each section's "body".`;
    case "PPT":
      return `Produce a teaching presentation of about ${p.slides ?? 12} slides. The first slide is a cover (title only), then Learning Objectives, then theory/concept slides with 3-5 concise bullets each, worked Examples, ${p.includePYQ ? "a Previous Year Questions (CBSE board only) slide, " : ""}a Summary slide, ${p.includeHomework ? "a Homework slide, " : ""}and a closing "Thank You" slide. Add brief speaker "notes" to content slides. Use theme "${p.theme ?? "MODERN_EDUCATION"}".`;
    case "TEST":
      return `Produce a ${p.testKind ?? "CHAPTER_TEST"} of ${p.questionCount ?? 15} questions worth ${p.totalMarks ?? 40} marks total, for ${p.durationMin ?? 90} minutes, at ${p.difficulty ?? "MEDIUM"} difficulty. Follow the CBSE board pattern with a mix of MCQ, short-answer, long-answer, case-study and assertion-reason questions. Set "totalMarks" and "durationMin". Provide general "instructions". For every question include the "answer"${p.includeSolutions ? ` and a step-by-step "solution"` : ""}.`;
    case "WORKSHEET":
      return `Produce a practice worksheet of ${p.questionCount ?? 12} questions at ${p.difficulty ?? "MEDIUM"} difficulty with a variety of question types. Include the "answer" for each${p.includeSolutions ? ` and a "solution"` : ""}.`;
    case "DPP":
      return `Produce a Daily Practice Problem set of ${p.questionCount ?? 10} focused, exam-oriented questions at ${p.difficulty ?? "MEDIUM"} difficulty. Include the "answer" for each${p.includeSolutions ? ` and a "solution"` : ""}.`;
    case "PYQ":
      return `Produce ${p.questionCount ?? 12} Previous Year Questions from CBSE board examinations only, relevant to this chapter. Include the "answer" for each and note the question "type".`;
    case "QUESTION_BANK":
      return `Produce a question bank of ${p.questionCount ?? 20} questions at ${p.difficulty ?? "MEDIUM"} difficulty, mixing NCERT, important board, HOTS and competency-based questions. Set "type" accordingly and include an "answer" for each.`;
    default:
      return `Produce high-quality educational content for this chapter.`;
  }
}

/** A chapter blueprint from the CBSE mapping, injected so the AI covers the
 * right concepts and tags the matching built-in diagrams. */
function mappingBlueprint(mapping: ChapterMapping): string {
  const lines: string[] = [];
  if (mapping.concepts.length) {
    lines.push(
      `Cover these key concepts (each as its own section/slide/question where it fits) and set "diagramId" to the concept id so the right figure is attached: ${mapping.concepts.join(", ")}.`,
    );
  }
  if (mapping.keywords.length) lines.push(`Important keywords to include: ${mapping.keywords.join(", ")}.`);
  if (mapping.formulas.length) lines.push(`Include these formulas (as "formulas" and/or formula boxes): ${mapping.formulas.join("  |  ")}.`);
  if (mapping.experiments.length) lines.push(`Reference these experiments/activities where relevant: ${mapping.experiments.join("; ")}.`);
  return lines.length
    ? `\n\nCHAPTER BLUEPRINT (follow this mapping precisely):\n${lines.map((l) => `- ${l}`).join("\n")}`
    : "";
}

export function buildPrompt(
  input: PromptInput,
  mapping?: ChapterMapping | null,
): {
  system: string;
  user: string;
} {
  const shape = shapeForType(input.type);
  const cls = CLASS_LABELS[input.classLevel];
  const subj = SUBJECT_LABELS[input.subject];

  const system = `You are Real Pathshala AI, an expert CBSE ${cls} teacher and content author for ${subj}. You strictly follow the latest NCERT syllabus and the CBSE board examination pattern. Use correct notation, units and Indian curriculum conventions. When asked for previous-year questions, use CBSE board examinations only.

You must respond with ONLY a single valid JSON object that matches this exact schema — no markdown, no code fences, no commentary:

${SHAPE_CONTRACT[shape]}`;

  const target = [
    `Class: ${cls}`,
    `Subject: ${subj}`,
    input.chapter ? `Chapter: ${input.chapter}` : null,
    input.topic ? `Topic focus: ${input.topic}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const blueprint = mapping ? mappingBlueprint(mapping) : "";

  const user = `${target}

Task: ${instructionsForType(input)}${blueprint}

Return only the JSON object.`;

  return { system, user };
}
