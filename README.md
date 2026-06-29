# Real Pathshala AI

An AI-powered SaaS platform for **CBSE Class 10, 11 & 12** where teachers and coaching
institutes generate **Notes, PPTs, Question Papers, DPPs, Worksheets, MCQs, PYQs, Mind
Maps, Lesson Plans and Question Banks** — then export to **PDF, DOCX and PPTX**.

Built with **Next.js 15 · TypeScript · Tailwind CSS · shadcn-style UI · Prisma ·
PostgreSQL · Auth.js · Anthropic Claude**, ready to deploy on **Vercel**.

---

## ✨ Features

| | |
| --- | --- |
| 🔐 **Auth** | Email/password + Google sign-in (Auth.js), protected routes |
| 📊 **Dashboard** | Stats, quick actions, recently created content |
| 📝 **9 AI generators** | Notes · PPT · Test · Worksheet · DPP · PYQ · Mind Map · Lesson Plan · Question Bank |
| 📦 **Exports** | PDF (pdf-lib), DOCX (docx), PPTX (pptxgenjs) — themed decks & answer keys |
| 🕘 **History & Saved** | Searchable, filterable library of everything you generate |
| 🛡️ **Admin panel** | Platform-wide usage: users, projects, exports, token spend |
| 🔎 **Search** | By class, subject, chapter, topic, keywords |
| 🌗 **UX** | Responsive, dark mode, sidebar nav, animations, loading states |

8 subjects: Mathematics · Physics · Chemistry · Biology · English · Business Studies ·
Economics · Accountancy.

---

## 🧱 Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components, Route Handlers) + TypeScript
- **UI:** Tailwind CSS, Radix primitives, shadcn-style components, lucide-react, next-themes
- **Auth:** Auth.js (NextAuth v5) — Credentials + Google, JWT sessions, edge middleware
- **Database:** PostgreSQL via Prisma ORM
- **AI:** Anthropic Claude (`claude-opus-4-8`) with JSON-schema-validated output
- **Generation:** `pdf-lib`, `docx`, `pptxgenjs`
- **Tests:** Vitest

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/                  # login, register
│   ├── (dashboard)/             # dashboard, generate/[type], history, saved, projects/[id], admin
│   ├── api/                     # auth, register, generate, projects, curriculum, admin
│   ├── layout.tsx · page.tsx · globals.css · providers.tsx
├── components/
│   ├── ui/                      # button, card, input, select, badge, dropdown-menu, …
│   ├── layout/app-shell.tsx     # sidebar + topbar + dark mode
│   ├── dashboard/               # project-card, projects-view
│   └── generators/              # generator-form, content-preview, export-bar
├── lib/
│   ├── ai/                      # client, prompts, schemas (zod), mock
│   ├── generators/              # pdf, docx, pptx renderers
│   ├── auth.ts · auth.config.ts # Auth.js (node + edge-safe split)
│   ├── content-types.ts         # registry driving the 9 generators
│   ├── curriculum.ts            # CBSE classes, subjects, chapters
│   ├── prisma.ts · utils.ts · validation.ts
│   └── __tests__/               # vitest
├── middleware.ts                # route protection
└── types/next-auth.d.ts
prisma/
├── schema.prisma · seed.ts
docs/                            # architecture, schema, wireframes, API & AI-prompt specs, deployment
```

---

## 🚀 Getting Started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env      # then fill in the values (see below)

# 3. Database
npm run db:push           # create tables (or: npm run db:migrate)
npm run db:seed           # seed CBSE curriculum

# 4. Run
npm run dev               # http://localhost:3000
```

> **No `ANTHROPIC_API_KEY`?** The app still runs end-to-end — generators return clearly
> labelled placeholder content so you can navigate, export, and demo without burning tokens.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Auth.js session secret — `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | ◻︎ | Enables real Claude generation (mock used if absent) |
| `CLAUDE_MODEL` | ◻︎ | Defaults to `claude-opus-4-8` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ◻︎ | Enables Google sign-in |
| `ADMIN_EMAILS` | ◻︎ | Comma-separated emails granted the ADMIN role |

---

## 🧪 Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Run the production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run db:push` / `db:migrate` / `db:seed` | Database management |

---

## 📦 Deployment

One-click on **Vercel** + a managed PostgreSQL (Neon / Supabase / Vercel Postgres).
Full walkthrough: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

---

## 📄 Documentation

- [Architecture](./docs/architecture.md)
- [Database Schema](./docs/database-schema.md)
- [API Specification](./docs/api-spec.md)
- [UI Wireframes](./docs/wireframes.md)
- [AI Prompt Templates](./docs/ai-prompts.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 📝 License

MIT
