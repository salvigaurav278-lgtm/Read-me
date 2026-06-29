# AI Prompt Templates — Real Pathshala AI Content Creator

The platform uses the **Google Gemini API (AI Studio)** via the `@google/genai` SDK.
Default model:

- `gemini-2.5-flash` — fast, cost-effective generation for notes, papers, and decks.
  Override with the `GEMINI_MODEL` environment variable.

> Implementation note: `src/lib/ai/client.ts` calls `ai.models.generateContent` with the
> system instruction, `responseMimeType: "application/json"` for structured output, and a
> Zod-validated repair retry. This document defines the **prompt contracts** the renderers
> depend on.

## Design Principles

1. **Persona via system prompt** — Gemini acts as an expert CBSE teacher who follows
   the latest NCERT syllabus and CBSE board pattern.
2. **Strict JSON output** — every generator requests a fixed JSON schema so the
   PDF/DOCX/PPTX renderers map output deterministically. No prose outside JSON.
3. **Curriculum grounding** — class, subject, chapter (and seeded chapter metadata)
   are injected so content stays on-syllabus.
4. **CBSE-only PYQs** — when previous-year questions are requested, restrict strictly
   to CBSE board examinations.

---

## Shared System Prompt (base)

```
You are Real Pathshala AI, an expert CBSE {{classLevel}} teacher and content author.
You strictly follow the latest NCERT syllabus and CBSE board examination pattern.
Subject: {{subject}}. Chapter: {{chapter}}.
Respond with ONLY valid JSON matching the provided schema. Do not include markdown
fences or commentary. Use correct units, notation, and Indian curriculum conventions.
For previous-year questions, use CBSE board exams only.
```

---

## 1. Notes Generator

**User prompt:** style = `{{style}}` (SHORT | DETAILED | REVISION | ONE_SHOT |
FORMULA_SHEET | MIND_MAP).

**Output JSON contract**
```json
{
  "title": "string",
  "classLevel": "CLASS_10",
  "subject": "MATHEMATICS",
  "chapter": "string",
  "style": "DETAILED",
  "sections": [
    {
      "heading": "string",
      "points": ["string"],
      "formulas": [{ "name": "string", "expression": "string" }],
      "examples": [{ "problem": "string", "solution": "string" }]
    }
  ],
  "keyTakeaways": ["string"],
  "mindMap": { "root": "string", "branches": [{ "label": "string", "children": ["string"] }] }
}
```
`mindMap` populated only for `MIND_MAP`; `formulas` emphasized for `FORMULA_SHEET`.

---

## 2. Test / Paper Generator

**User prompt:** `testKind`, `difficulty`, `totalMarks`, `durationMin`,
`questionMix` (counts per `QuestionType`), and flags for answer key / solutions /
marking scheme.

**Output JSON contract**
```json
{
  "title": "string",
  "meta": { "totalMarks": 80, "durationMin": 180, "instructions": ["string"] },
  "sections": [
    {
      "name": "Section A",
      "questions": [
        {
          "number": 1,
          "type": "MCQ",
          "marks": 1,
          "text": "string",
          "options": ["A", "B", "C", "D"],
          "caseStudy": { "passage": "string", "subQuestions": ["string"] },
          "assertionReason": { "assertion": "string", "reason": "string" }
        }
      ]
    }
  ],
  "answerKey": [{ "number": 1, "answer": "string" }],
  "solutions": [{ "number": 1, "steps": ["string"], "finalAnswer": "string" }],
  "markingScheme": [{ "number": 1, "breakdown": ["1m for …"] }]
}
```

---

## 3. PPT Generator

**User prompt:** `slides`, `theme`, flags (`includePYQ`, `includeDiagrams`,
`includeHomework`).

**Output JSON contract**
```json
{
  "title": "string",
  "theme": "MODERN_EDUCATION",
  "slides": [
    {
      "layout": "cover | objectives | theory | diagram | table | flowchart | example | questions | pyq | summary | homework | thankyou",
      "title": "string",
      "bullets": ["string"],
      "table": { "headers": ["string"], "rows": [["string"]] },
      "diagramDescription": "string",
      "flowchart": ["Step 1", "Step 2"],
      "notes": "speaker notes"
    }
  ]
}
```
Slide order enforced: cover → objectives → theory → … → homework → thank-you.

---

## 4. Question Bank Generator

**User prompt:** `questionTypes[]` (incl. `HOTS`, `COMPETENCY_BASED`), `count`,
and category flags (NCERT / Board / PYQ-CBSE / Extra Practice).

**Output JSON contract**
```json
{
  "title": "string",
  "questions": [
    {
      "category": "NCERT | BOARD | PYQ_CBSE | HOTS | COMPETENCY | EXTRA",
      "type": "SHORT_ANSWER",
      "marks": 3,
      "text": "string",
      "answer": "string"
    }
  ]
}
```

---

## 5. Lesson Planner

**User prompt:** `periods`.

**Output JSON contract**
```json
{
  "title": "string",
  "periods": 3,
  "objectives": ["string"],
  "teachingStrategy": ["string"],
  "activities": [{ "name": "string", "duration": "10 min", "description": "string" }],
  "assessment": ["string"],
  "homework": ["string"],
  "expectedOutcomes": ["string"]
}
```

---

## Validation

Every AI response is parsed and validated against a Zod schema mirroring these
contracts (`packages/shared/src/contracts`). On parse failure the orchestrator
retries once with a "return valid JSON only" repair instruction before failing the job.
