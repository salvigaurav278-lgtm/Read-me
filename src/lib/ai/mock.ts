import type { PromptInput } from "./prompts";
import { shapeForType, type GeneratedContent } from "./schemas";
import { SUBJECT_LABELS, CLASS_LABELS } from "@/lib/curriculum";

// Deterministic placeholder content used when GEMINI_API_KEY is not set,
// so the app is fully navigable in development/CI without external calls.
export function mockContent(input: PromptInput): GeneratedContent {
  const chapter = input.chapter || "Sample Chapter";
  const subj = SUBJECT_LABELS[input.subject];
  const cls = CLASS_LABELS[input.classLevel];
  const title = `${chapter} — ${subj} (${cls})`;
  const shape = shapeForType(input.type);

  if (shape === "deck") {
    return {
      kind: "deck",
      title,
      theme: String(input.params.theme ?? "MODERN_EDUCATION"),
      slides: [
        { title, bullets: [] },
        {
          title: "Learning Objectives",
          bullets: [
            `Understand the core concepts of ${chapter}`,
            "Apply concepts to solve problems",
            "Connect ideas to board-level questions",
          ],
          notes: "Set the agenda for the lesson.",
        },
        {
          title: `Key Concepts of ${chapter}`,
          bullets: ["Concept one", "Concept two", "Concept three"],
          notes: "Explain each concept with an example.",
        },
        {
          title: "Summary",
          bullets: ["Recap of key ideas", "Common mistakes to avoid"],
        },
        { title: "Thank You", bullets: [] },
      ],
    };
  }

  if (shape === "paper") {
    return {
      kind: "paper",
      title,
      instructions: [
        "All questions are compulsory.",
        "This is sample content — set GEMINI_API_KEY for AI generation.",
      ],
      totalMarks: Number(input.params.totalMarks ?? 20),
      durationMin: Number(input.params.durationMin ?? 60),
      questions: Array.from({ length: 5 }).map((_, i) => ({
        number: i + 1,
        text: `Sample question ${i + 1} on ${chapter}.`,
        type: i % 2 === 0 ? "MCQ" : "SHORT_ANSWER",
        marks: 2,
        options: i % 2 === 0 ? ["Option A", "Option B", "Option C", "Option D"] : undefined,
        answer: "Sample answer.",
        solution: ["Step 1", "Step 2"],
      })),
    };
  }

  return {
    kind: "document",
    title,
    sections: [
      {
        heading: "Introduction",
        body: [
          `This is sample content for ${chapter}.`,
          "Set GEMINI_API_KEY to generate real AI content.",
        ],
      },
      {
        heading: "Key Concepts",
        body: ["First key idea", "Second key idea", "Third key idea"],
        formulas: [{ name: "Example", expression: "a^2 + b^2 = c^2" }],
      },
    ],
    keyPoints: ["Takeaway one", "Takeaway two", "Takeaway three"],
  };
}
