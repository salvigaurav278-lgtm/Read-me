# API Specification — Real Pathshala AI

Next.js Route Handlers under `/api`. JSON in/out. Auth via Auth.js session cookie.
Validation with Zod. Errors: `{ "error": "message" }` with an appropriate status code.

## Auth

| Method | Path | Description |
| --- | --- | --- |
| `GET/POST` | `/api/auth/[...nextauth]` | Auth.js handler (sign-in, callback, session, sign-out) |
| `POST` | `/api/register` | Email/password signup `{ name, email, password }` |

## Curriculum

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/curriculum?class=CLASS_10&subject=MATHEMATICS` | Chapter suggestions |

## Generation

| Method | Path | Body |
| --- | --- | --- |
| `POST` | `/api/generate` | `{ type, classLevel, subject, chapter?, topic?, params }` |

`type` is one of `NOTES, PPT, TEST, WORKSHEET, DPP, PYQ, MIND_MAP, LESSON_PLAN,
QUESTION_BANK`. Creates a `Project`, runs Claude, returns `{ id, mocked }`.

## Projects & Exports

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/projects` | List (filters: `type, class, subject, q, saved`) |
| `GET` | `/api/projects/:id` | Get one (with content) |
| `PATCH` | `/api/projects/:id` | Rename / save toggle `{ title?, saved? }` |
| `DELETE` | `/api/projects/:id` | Delete |
| `POST` | `/api/projects/:id/export` | `{ format: PDF\|DOCX\|PPTX }` → streams the file |

## Admin

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/stats` | Platform stats (ADMIN only) |

## Status codes

`200` ok · `201` created · `400` validation · `401` unauthorized · `403` forbidden ·
`404` not found · `409` conflict · `422` corrupt content · `500` server error.
