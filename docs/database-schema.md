# Database Schema — Real Pathshala AI Content Creator

PostgreSQL via Prisma. The canonical definition lives in
[`prisma/schema.prisma`](../prisma/schema.prisma). This document explains the model.

## Entity-Relationship Overview

```
User 1───* Folder 1───* Folder        (self-referential tree)
User 1───* Project *───1 Folder        (project optionally in a folder)
User 1───* Template
User 1───* PasswordResetToken
User 1───* Account / Session           (Auth.js)

Project 1───* ProjectExport            (PDF / DOCX / PPTX renders)
Project 1───* GenerationJob            (AI generation runs)

Chapter                                (seeded CBSE curriculum reference)
```

## Core Tables

### `User`
Teachers / institute admins. Supports email-password and Google OAuth
(`passwordHash` is null for OAuth-only accounts). Roles: `TEACHER`,
`INSTITUTE_ADMIN`, `STUDENT`, `ADMIN`.

### `Account`, `Session`, `VerificationToken`
Auth.js (NextAuth) standard tables for OAuth accounts, sessions, and email
verification.

### `PasswordResetToken`
One-time tokens for the forgot-password flow, with `expires` and `usedAt`.

### `Folder`
Self-referential tree (`parentId`) for organizing projects into nested folders.

### `Project`
The central content entity. A single row represents one generated artifact
(Notes / Test / PPT / Question Bank / Lesson Plan / Worksheet / DPP).

| Column | Purpose |
| --- | --- |
| `type` | `ContentType` enum |
| `classLevel`, `subject`, `chapter`, `topic` | CBSE targeting |
| `params` (JSON) | Generation options — note style, difficulty, question mix, marks, time, theme |
| `content` (JSON) | Structured AI output rendered into exports |
| `status` | `DRAFT → GENERATING → READY → ARCHIVED` |

### `ProjectExport`
Each rendered file. Unique on `(projectId, format, contentHash)` so identical
renders are deduped. Stores `fileUrl`, `fileName`, `sizeBytes`.

### `GenerationJob`
Tracks each AI run: `status` (`QUEUED → RUNNING → SUCCEEDED/FAILED`), model used,
token counts, errors, timing. Drives SSE progress to the client.

### `Template`
Reusable generation presets per content type; can be private or public.

### `Chapter`
Seeded CBSE curriculum reference (class + subject + chapter number/name/unit),
used to populate dropdowns and ground AI prompts.

## Enums (selected)

- **ContentType:** `NOTES, TEST, WORKSHEET, DPP, PPT, QUESTION_BANK, ANSWER_KEY, LESSON_PLAN`
- **NoteStyle:** `SHORT, DETAILED, REVISION, ONE_SHOT, FORMULA_SHEET, MIND_MAP`
- **TestKind:** `CHAPTER_TEST, UNIT_TEST, FULL_SYLLABUS, SAMPLE_PAPER, BOARD_PATTERN, PRACTICE_WORKSHEET, DPP`
- **QuestionType:** `MCQ, CASE_STUDY, ASSERTION_REASON, SHORT_ANSWER, LONG_ANSWER, COMPETENCY_BASED, HOTS`
- **Difficulty:** `EASY, MEDIUM, HARD`
- **PptTheme:** `BLUE, GREEN, DARK, MINIMAL, MODERN_EDUCATION`
- **ExportFormat:** `PDF, DOCX, PPTX`

## Indexing Strategy

- `User.email` unique + indexed (login lookups).
- `Project` indexed on `userId`, `folderId`, `type`, and `(classLevel, subject)`
  for dashboard filtering and search.
- `GenerationJob` indexed on `status` for queue scans.
- `Chapter` unique on `(classLevel, subject, number)`.

## JSON Contracts

`Project.params` and `Project.content` are typed in `packages/shared` (TypeScript
DTOs). The AI output JSON contract per content type is defined in
[`docs/ai-prompts.md`](./ai-prompts.md).
