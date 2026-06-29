# Roadmap — Real Pathshala AI Content Creator

The platform is delivered in **8 phases**. Each phase produces working, reviewable
code and stops for approval before the next begins.

---

## ✅ Phase 1 — Foundation & Architecture _(current)_

**Goal:** Establish the blueprint and skeleton everything else builds on.

Deliverables:
- [x] Project architecture document (`docs/architecture.md`)
- [x] Full database schema (`prisma/schema.prisma` + `docs/database-schema.md`)
- [x] Monorepo folder structure (`apps/`, `packages/`, `prisma/`, `docs/`)
- [x] UI wireframes (`docs/wireframes.md`)
- [x] Backend API specification (`docs/api-spec.md`)
- [x] AI prompt template design (`docs/ai-prompts.md`)
- [x] Shared CBSE curriculum data & types (`packages/shared`)
- [x] Workspace tooling: root `package.json`, `tsconfig`, `.env.example`, `.gitignore`

---

## ⏳ Phase 2 — Database & Models

- Prisma client setup, migrations, seed script with CBSE curriculum.
- Data-access layer (repositories) in `apps/api`.
- Model unit tests.

## ⏳ Phase 3 — Authentication

- Auth.js (NextAuth) config: Email + Google providers, sessions, password reset.
- Protected routes, middleware, user profile.
- API auth guard (JWT/session verification).

## ⏳ Phase 4 — Backend APIs & AI Orchestration

- Express routers for Notes, Tests, PPT, Question Bank, Lesson Plan.
- Claude API client + prompt-builder service + streaming.
- Generation job queue & status tracking.

## ⏳ Phase 5 — File Generation Modules

- PDF module (notes, tests, answer keys).
- DOCX module (notes).
- PPTX module (themed decks).
- Storage abstraction (local/S3) + download endpoints.

## ⏳ Phase 6 — Frontend Core

- App shell: sidebar nav, dark mode, responsive layout, animations.
- Dashboard with recent files & stats.
- Generator wizards (Notes, Test, PPT, Question Bank, Lesson Plan).
- Loading/progress indicators.

## ⏳ Phase 7 — Search, Files & Templates

- Search by class/subject/chapter/topic/keywords.
- File manager: folders, rename, duplicate, delete, drag-and-drop.
- Saved templates.

## ⏳ Phase 8 — Testing & Deployment

- Unit + integration tests (Jest/Vitest), Playwright E2E.
- CI workflow.
- Deployment guide (Vercel + Render/Fly + managed Postgres).

---

### Phase status legend
✅ done · ⏳ planned · 🚧 in progress
