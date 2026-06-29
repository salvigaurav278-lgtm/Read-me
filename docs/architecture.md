# Architecture — Real Pathshala AI Content Creator

## 1. System Overview

Real Pathshala is a **monorepo** containing a Next.js frontend (`apps/web`) and an
Express backend (`apps/api`), sharing types and curriculum data via `packages/shared`.
PostgreSQL (through Prisma) is the system of record. The backend orchestrates the
Claude API to generate educational content and renders it into PDF, DOCX, and PPTX.

```
                         ┌───────────────────────────────────────────┐
                         │                Browser (SPA)              │
                         │   Next.js App Router · React · Tailwind   │
                         └───────────────┬───────────────────────────┘
                                         │ HTTPS (REST + SSE)
                ┌────────────────────────┼────────────────────────────┐
                │                        │                            │
        ┌───────▼────────┐      ┌────────▼─────────┐         ┌────────▼────────┐
        │  Auth.js        │      │  Express API     │         │  Static / CDN   │
        │  (NextAuth)     │      │  apps/api        │         │  exported files │
        │  Email + Google │      │                  │         └─────────────────┘
        └───────┬─────────┘      └───┬─────────┬────┘
                │                    │         │
        ┌───────▼─────────┐  ┌───────▼───┐ ┌───▼───────────────┐
        │  PostgreSQL     │  │ Claude API│ │ Generation Engines │
        │  (Prisma)       │  │ Anthropic │ │ PDF · DOCX · PPTX  │
        └─────────────────┘  └───────────┘ └────────────────────┘
```

## 2. Components

### 2.1 Frontend — `apps/web`
- **Next.js App Router** with server components for shells and client components for
  interactive generators.
- **Auth.js** session provider; route protection via middleware.
- **State:** TanStack Query for server state, Zustand for local UI state.
- **UI:** Tailwind CSS, Radix primitives, Framer Motion animations, dark mode via
  `next-themes`.
- Talks to the backend over REST; long-running generation streams via Server-Sent
  Events (SSE) for live progress.

### 2.2 Backend — `apps/api`
- **Express + TypeScript**, layered:
  - `routes/` → thin HTTP handlers
  - `controllers/` → request validation (Zod) & response shaping
  - `services/` → business logic (generation orchestration)
  - `repositories/` → Prisma data access
  - `generators/` → PDF / DOCX / PPTX renderers
  - `ai/` → Claude client, prompt builders, streaming
- **Job model:** each generation creates a `GenerationJob` row; status transitions
  (`QUEUED → RUNNING → SUCCEEDED/FAILED`) are streamed to the client.

### 2.3 Shared — `packages/shared`
- TypeScript types/DTOs shared by web & api.
- CBSE curriculum constants (classes, subjects, chapters).
- Enums (content types, note styles, question types, themes).

### 2.4 Data — `prisma`
- Single source of truth for the schema; migrations under `prisma/migrations`.

## 3. Request Lifecycle — "Generate Notes"

1. User submits the Notes wizard (class, subject, chapter, style).
2. `POST /api/notes` validates input, creates `Project` + `GenerationJob`, returns job id.
3. Client opens `GET /api/jobs/:id/stream` (SSE).
4. `NotesService` builds a prompt (`ai/prompts/notes.ts`), calls Claude, streams tokens.
5. Generated structured content is persisted to `Project.content` (JSON).
6. User clicks **Export** → `POST /api/projects/:id/export` → renderer produces a file →
   `ProjectExport` row + download URL.

## 4. AI Orchestration

- Provider: **Anthropic Claude** (`claude-opus-4-8` for high-quality long content,
  `claude-sonnet-4-6` for fast/cheap drafts).
- Prompts are **structured**: a system prompt defines the persona (CBSE expert teacher)
  and an output JSON contract; user prompts inject curriculum context.
- Output is requested as **strict JSON** so renderers can map it deterministically into
  PDF/DOCX/PPTX layouts (see `docs/ai-prompts.md`).

## 5. Security & Reliability

- All API routes behind session/JWT auth except auth endpoints.
- Input validation with Zod on every endpoint.
- Rate limiting per user on generation endpoints.
- Secrets via environment variables (never committed); see `.env.example`.
- Idempotent exports keyed by `(projectId, format, contentHash)`.

## 6. Deployment Topology (Phase 8)

- **web** → Vercel.
- **api** → Render / Fly.io container.
- **db** → managed PostgreSQL (Neon / Supabase / RDS).
- **files** → S3-compatible bucket + CDN.
- CI: lint, typecheck, test, build per package.

## 7. Non-Functional Targets

| Concern | Target |
| --- | --- |
| Notes generation (P50) | < 15 s to first content |
| Export render | < 5 s for a 20-slide PPT |
| Availability | 99.5% |
| Accessibility | WCAG 2.1 AA |
