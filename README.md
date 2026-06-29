# Real Pathshala AI Content Creator

An AI-powered content creation platform for teachers and coaching institutes that
generates **Notes, Tests, Worksheets, DPPs, PowerPoint Presentations, Question Banks,
Answer Keys, and Lesson Plans** for **CBSE Class 10, 11, and 12**.

> Subjects: Mathematics · Physics · Chemistry · Biology · English · Business Studies ·
> Economics · Accountancy

---

## ✨ Features

| Module | What it does |
| --- | --- |
| 📝 **AI Notes Generator** | Short / Detailed / Revision / One-Shot notes, Formula Sheets, Mind Maps — export PDF & DOCX |
| 🧪 **AI Test Generator** | Chapter/Unit/Full tests, Sample & Board-pattern papers, DPPs, Worksheets with answer keys, solutions & marking schemes |
| 📊 **AI PPT Generator** | Professional teaching decks with themes — export PPTX & PDF |
| 📚 **Question Bank Generator** | NCERT, Board, PYQ (CBSE), HOTS & Competency-based questions |
| 🗓️ **AI Lesson Planner** | Objectives, strategy, activities, assessment, outcomes |
| 🗂️ **File Management** | Folders, rename, duplicate, delete, download |
| 🔍 **Smart Search** | By class, subject, chapter, topic, keywords |
| 🔐 **Auth** | Email + Google login, password reset, profiles |

---

## 🧱 Tech Stack

- **Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS · Framer Motion
- **Backend:** Node.js · Express · TypeScript
- **Database:** PostgreSQL · Prisma ORM
- **Auth:** Auth.js (NextAuth) with Email + Google providers
- **AI:** Claude API (Anthropic) — `claude-opus-4-8` / `claude-sonnet-4-6`
- **Generation:** `pdfkit` / Puppeteer (PDF) · `pptxgenjs` (PPTX) · `docx` (DOCX)

---

## 📦 Monorepo Layout

```
real-pathshala-ai/
├── apps/
│   ├── web/        # Next.js frontend (UI, dashboard, auth pages)
│   └── api/        # Express backend (AI orchestration, file generation)
├── packages/
│   ├── shared/     # Shared TS types, constants, CBSE curriculum data
│   └── config/     # Shared tsconfig / eslint / tailwind presets
├── prisma/         # Prisma schema & migrations
└── docs/           # Architecture, schema, wireframes, API & AI-prompt specs
```

---

## 🚀 Development Roadmap (Phased)

This project is built **in reviewable phases**. See [`ROADMAP.md`](./ROADMAP.md).

1. **Phase 1 — Foundation & Architecture** ✅ _(this delivery)_
2. Phase 2 — Database, Prisma models & migrations
3. Phase 3 — Authentication system
4. Phase 4 — Backend APIs & AI orchestration layer
5. Phase 5 — File generation modules (PDF / DOCX / PPTX)
6. Phase 6 — Frontend: dashboard, sidebar, generators
7. Phase 7 — Search, file management & templates
8. Phase 8 — Testing, CI & deployment

Each phase stops for approval before the next begins.

---

## 🛠️ Getting Started (after Phase 2+)

```bash
# install workspace deps
npm install

# set up env
cp .env.example .env

# database
npm run db:migrate
npm run db:seed

# run dev (web + api)
npm run dev
```

---

## 📄 Documentation

- [Architecture](./docs/architecture.md)
- [Database Schema](./docs/database-schema.md)
- [UI Wireframes](./docs/wireframes.md)
- [API Specification](./docs/api-spec.md)
- [AI Prompt Templates](./docs/ai-prompts.md)
- [Roadmap & Phases](./ROADMAP.md)

---

## 📝 License

MIT
