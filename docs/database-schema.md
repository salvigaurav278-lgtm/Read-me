# Database Schema — Real Pathshala AI

PostgreSQL via Prisma. Canonical definition: [`prisma/schema.prisma`](../prisma/schema.prisma).

## Models

```
User 1───* Project 1───* ProjectExport
User 1───* Account / Session   (Auth.js)
Chapter                        (seeded CBSE curriculum)
```

### `User`
Teachers / admins. `passwordHash` (null for Google-only accounts), `role`
(`TEACHER` | `ADMIN`). Standard Auth.js relations: `Account`, `Session`.

### `Account`, `Session`, `VerificationToken`
Auth.js (NextAuth) tables for OAuth accounts, sessions and email verification.

### `Project`
The central content entity — one generated artifact.

| Column | Purpose |
| --- | --- |
| `type` | `ContentType` (NOTES, PPT, TEST, WORKSHEET, DPP, PYQ, MIND_MAP, LESSON_PLAN, QUESTION_BANK) |
| `status` | `GENERATING → READY / FAILED` |
| `classLevel`, `subject`, `chapter`, `topic` | CBSE targeting |
| `params` (JSON) | Generation options (style, difficulty, marks, theme, …) |
| `content` (JSON) | Structured AI output (document / paper / deck shape) |
| `saved` | Bookmarked into "Saved Files" |
| `tokensUsed` | Claude token usage for admin metrics |
| `error` | Failure message when `status = FAILED` |

### `ProjectExport`
One row per rendered file: `format` (`PDF` | `DOCX` | `PPTX`), `fileName`, `createdAt`.

### `Chapter`
Seeded CBSE reference (class + subject + number + name), unique on
`(classLevel, subject, number)`. Powers chapter suggestions in the generator.

## Enums

`UserRole`, `ClassLevel`, `Subject` (8 subjects), `ContentType` (9 types),
`ProjectStatus`, `ExportFormat`.

## Indexing

`User.email` unique. `Project` indexed on `userId`, `type`, and `(classLevel, subject)`
for dashboard filtering and search.
