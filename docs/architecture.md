# Architecture — Real Pathshala AI

## Overview

A single **Next.js 15** application (App Router) provides both the UI and the backend
(Route Handlers). PostgreSQL via Prisma is the system of record. The backend orchestrates
the Anthropic Claude API to generate structured educational content and renders it into
PDF, DOCX and PPTX.

```
                ┌──────────────────────────────────────────────┐
                │            Browser (React, Tailwind)         │
                │   Server + Client Components · dark mode     │
                └───────────────┬──────────────────────────────┘
                                │ HTTPS
                ┌───────────────▼──────────────────────────────┐
                │              Next.js 15 (App Router)         │
                │   Pages (RSC)   ·   Route Handlers (/api)    │
                │   Auth.js middleware (edge route guard)      │
                └───┬───────────────┬───────────────┬──────────┘
                    │               │               │
            ┌───────▼─────┐  ┌──────▼──────┐  ┌─────▼─────────────┐
            │ PostgreSQL  │  │ Claude API  │  │ Export engines    │
            │ (Prisma)    │  │ (Anthropic) │  │ pdf-lib·docx·pptx │
            └─────────────┘  └─────────────┘  └───────────────────┘
```

## Layers

- **UI** — `src/app` pages. Server Components fetch data via Prisma and `auth()`; Client
  Components (`"use client"`) handle forms, dropdowns, theme and downloads.
- **Auth** — `src/lib/auth.ts` (Node: Prisma adapter + Credentials/bcrypt) and
  `src/lib/auth.config.ts` (edge-safe base used by `middleware.ts` to gate routes).
- **API** — Route Handlers under `src/app/api/*` validate input with Zod, enforce
  ownership, and call the AI / export layers.
- **AI orchestration** — `src/lib/ai`: `prompts.ts` builds a per-type system/user prompt
  with a strict JSON output contract; `client.ts` calls Claude (`claude-opus-4-8`),
  validates the JSON with Zod, and retries once to repair malformed output. With no API
  key it falls back to `mock.ts`.
- **Content model** — every generator maps to one of three shapes (`document`, `paper`,
  `deck`) defined in `src/lib/ai/schemas.ts`. This keeps prompts, validation and renderers
  small while covering all 9 content types.
- **Export** — `src/lib/generators` renders the structured content to PDF/DOCX/PPTX.

## Generation lifecycle ("Generate Notes")

1. The generator wizard `POST`s to `/api/generate`.
2. The handler creates a `Project` (`GENERATING`), calls `generateContent()`.
3. Claude returns JSON → validated against the shape schema → persisted to `Project.content`,
   status `READY` (or `FAILED` with the error).
4. The user opens `/projects/[id]`, previews the content, and clicks **Export** →
   `/api/projects/[id]/export` streams the rendered file and records a `ProjectExport`.

## Security

- All non-auth routes require a session (`auth()`); ownership is checked per project.
- Zod validation on every endpoint; bcrypt-hashed passwords; JWT sessions.
- Secrets via environment variables (see `.env.example`).

## Non-functional

| Concern | Target |
| --- | --- |
| Notes generation (P50) | < 20 s |
| Export render | < 5 s |
| Accessibility | WCAG 2.1 AA-oriented components |
