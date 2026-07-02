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
    subtitle: `${cls} • ${subj}`,
    sections: [
      {
        heading: "Introduction",
        body: [
          `Everything around us is made up of matter — this is the starting idea of ${chapter}.`,
          "Matter exists as pure substances or as mixtures.",
        ],
        diagramId: "molecular-pure-mixture",
        diagram: "Particles of a pure substance vs a mixture.",
      },
      {
        heading: "Pure Substances and Mixtures",
        body: [
          "A pure substance has only one kind of particle and fixed properties.",
          "A mixture contains two or more substances and has no fixed properties.",
        ],
        example: "Distilled water is pure; air and soil are mixtures.",
        table: {
          headers: ["Basis", "Pure Substance", "Mixture"],
          rows: [
            ["Constituents", "One substance", "Two or more"],
            ["Properties", "Fixed", "Not fixed"],
            ["Separation", "Not possible physically", "Possible physically"],
          ],
        },
      },
      {
        heading: "Methods of Separation",
        body: [
          "Components of a mixture can be separated by physical methods.",
          "The method depends on the nature of the components.",
        ],
        keyPoints: ["Handpicking", "Filtration", "Evaporation", "Crystallisation"],
      },
      {
        heading: "Filtration",
        body: [
          "Used to separate an insoluble solid from a liquid.",
          "The solid stays on the filter paper; the liquid passes through.",
        ],
        example: "Separating sand from water.",
        diagramId: "filtration",
      },
      {
        heading: "Evaporation",
        body: [
          "Used to separate a soluble solid from a liquid.",
          "The liquid vaporises and the solid is left behind.",
        ],
        example: "Obtaining common salt from sea water.",
        diagramId: "evaporation",
      },
      {
        heading: "Crystallisation",
        body: [
          "Separates a pure solid in the form of crystals from its solution.",
          "A hot saturated solution is cooled slowly.",
        ],
        example: "Obtaining copper sulphate crystals.",
        diagramId: "crystallisation",
        tip: "Crystallisation gives purer solids than simple evaporation.",
      },
      {
        heading: "Magnetic Separation",
        body: ["Separates magnetic substances from non-magnetic ones using a magnet."],
        example: "Separating iron filings from sulphur.",
        diagramId: "magnet-separation",
      },
      {
        heading: "Sublimation",
        body: ["Separates a sublimable solid that turns directly from solid to vapour on heating."],
        example: "Separating ammonium chloride from salt.",
        diagramId: "sublimation",
      },
      {
        heading: "Solutions",
        body: [
          "A solution is a homogeneous mixture of a solute and a solvent.",
          "The solute particles are too small to be seen or filtered.",
        ],
        diagramId: "beaker-solution",
        mistake: "Do not confuse a solution (homogeneous) with a suspension.",
      },
    ],
    keyPoints: [
      "Matter is either a pure substance or a mixture.",
      "Pure substances have fixed composition and properties.",
      "Mixtures can be separated by physical methods.",
      "The method depends on the components' properties.",
    ],
    tips: ["Link every separation method to one real-life example while revising."],
    commonMistakes: ["Mixing up evaporation and crystallisation as identical methods."],
    keyTakeaways: [
      "Matter around us may be pure or a mixture.",
      "Pure substances have fixed properties and composition.",
      "Mixtures are separated using physical methods.",
    ],
    quote: "Purity is understanding what matter truly is.",
    summary: [
      `${chapter} explains pure substances, mixtures and how to separate them.`,
      "Practice diagrams of each separation method for the board exam.",
    ],
    pyqs: [
      { question: "Differentiate between a pure substance and a mixture.", answer: "A pure substance has fixed composition; a mixture does not.", year: "CBSE 2023" },
      { question: "Name two methods to separate an insoluble solid from a liquid.", answer: "Filtration and sedimentation/decantation.", year: "CBSE 2022" },
    ],
  };
}
