# apps/api — Backend (Express)

The Express + TypeScript backend: AI orchestration, generation jobs, project/file
management, and PDF/DOCX/PPTX rendering.

> **Built in Phases 3–5.** See [`../../ROADMAP.md`](../../ROADMAP.md),
> [`../../docs/api-spec.md`](../../docs/api-spec.md), and
> [`../../docs/ai-prompts.md`](../../docs/ai-prompts.md).

## Planned structure

```
apps/api/
├── src/
│   ├── routes/           # HTTP routers (notes, tests, ppt, q-bank, lesson, projects, folders, auth)
│   ├── controllers/      # Zod validation + response shaping
│   ├── services/         # generation orchestration, business logic
│   ├── repositories/     # Prisma data access
│   ├── ai/               # Claude client, prompt builders, streaming
│   ├── generators/       # pdf/ docx/ pptx renderers
│   ├── middleware/       # auth, rate-limit, error handler
│   ├── lib/              # prisma client, storage, mailer
│   └── server.ts
└── package.json
```

## Stack
Express · TypeScript · Prisma · Zod · Anthropic SDK · pptxgenjs · docx · pdfkit /
Puppeteer. Consumes `@pathshala/shared`.
