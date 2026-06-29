# apps/web — Frontend (Next.js)

The Next.js (App Router) frontend: dashboard, sidebar navigation, generator wizards,
file manager, search, and auth pages. Dark mode, responsive, animated.

> **Built in Phase 6** (Frontend Core) and Phase 7 (Search/Files/Templates).
> See [`../../ROADMAP.md`](../../ROADMAP.md) and [`../../docs/wireframes.md`](../../docs/wireframes.md).

## Planned structure

```
apps/web/
├── app/                  # App Router
│   ├── (auth)/           # login, register, forgot-password
│   ├── (dashboard)/      # dashboard, notes, tests, ppt, q-bank, lesson, files
│   ├── api/auth/[...nextauth]/   # Auth.js route
│   └── layout.tsx
├── components/           # ui/, generators/, dashboard/, layout/
├── lib/                  # api client, hooks, query setup
├── styles/               # tailwind globals
└── package.json
```

## Stack
Next.js · React · TypeScript · Tailwind CSS · Framer Motion · TanStack Query ·
Zustand · next-themes · Auth.js. Consumes `@pathshala/shared` types.
