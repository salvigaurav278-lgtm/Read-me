# CBSE Chapter → Concept Mapping

Every chapter maps to the concepts that matter — which drive the diagrams,
formulas, tables and examples in generated notes.

## How it works

- **Defaults** live in `src/lib/curriculum/chapterConcepts.ts` (code, modular —
  add/adjust entries freely). Each mapping has: `classLevel`, `subject`,
  `chapter`, `synonyms`, `concepts` (diagram ids), `keywords`, `formulas`,
  `experiments`.
- **Overrides** are edited at runtime from the admin dashboard and persisted via
  `configStore` (Vercel Blob in production, filesystem locally) — **no code
  changes or redeploy** needed. `listMappings()` merges defaults + overrides.
- **Synonym matching:** `getMapping(class, subject, chapter)` resolves by exact
  key, then by normalized chapter name, then by synonyms — so "Electric
  Current", "Current Electricity" and "Current Flow" all hit the same mapping.
- **Generation:** `generateContent` looks up the mapping and `buildPrompt`
  injects a **CHAPTER BLUEPRINT** instructing the AI to cover each concept as a
  section and tag the matching built-in `diagramId`. The renderer then attaches
  the diagram (local vector → cache → fetch).

## Admin dashboard — `/admin/mappings` (admin only)

- Toggle **online image fetching** (Enable / Disable / Use env default) at
  runtime.
- **Statistics:** chapters, concept links, concepts without a diagram, chapters
  without concepts — per subject.
- **Edit** any chapter's synonyms / concepts / keywords / formulas /
  experiments, add new chapters, or delete.
- **Bulk import / export** as JSON or CSV (`merge` or `replace`).

## Notes / limitations

- The app's generator UI currently exposes **Classes 10–12**. The mapping model
  accepts free-form class/subject strings (e.g. `CLASS_6`, `SCIENCE`), so 6–9
  entries can be authored now and light up when those classes are added to the
  curriculum enums.
- Concept ids in a mapping should exist in the diagram registry; the stats page
  lists any that don't (so you can add a vector or upload an image).
