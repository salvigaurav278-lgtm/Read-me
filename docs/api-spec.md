# API Specification — Real Pathshala AI Content Creator

Base URL: `/api`. All responses JSON. Auth via Auth.js session cookie or
`Authorization: Bearer <token>`. Validation with Zod. Errors use a consistent shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [] } }
```

Endpoints are **specified in Phase 1** and **implemented in Phases 3–5**.

---

## Auth

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Email/password signup |
| `POST` | `/auth/login` | Email/password login |
| `POST` | `/auth/logout` | End session |
| `GET`  | `/auth/google` | Google OAuth start |
| `GET`  | `/auth/google/callback` | Google OAuth callback |
| `POST` | `/auth/forgot-password` | Send reset link |
| `POST` | `/auth/reset-password` | Reset with token |
| `GET`  | `/auth/me` | Current user profile |
| `PATCH`| `/auth/me` | Update profile |

---

## Curriculum

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/curriculum/subjects?class=CLASS_10` | Subjects for a class |
| `GET` | `/curriculum/chapters?class=CLASS_10&subject=MATHEMATICS` | Chapter list |

---

## Generation

All generation endpoints create a `Project` + `GenerationJob` and return the job id.
Progress is streamed via SSE.

| Method | Path | Body (key fields) |
| --- | --- | --- |
| `POST` | `/notes` | `classLevel, subject, chapter, topic?, style` |
| `POST` | `/tests` | `classLevel, subject, chapters[], testKind, difficulty, totalMarks, durationMin, questionMix{}, includeAnswerKey, includeSolutions, includeMarkingScheme` |
| `POST` | `/ppt` | `classLevel, subject, chapter, slides, theme, includePYQ, includeDiagrams, includeHomework` |
| `POST` | `/question-bank` | `classLevel, subject, chapter, questionTypes[], count` |
| `POST` | `/lesson-plan` | `classLevel, subject, chapter, periods` |

**Response**
```json
{ "projectId": "…", "jobId": "…", "status": "QUEUED" }
```

### Job status & streaming

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/jobs/:id` | Job status snapshot |
| `GET` | `/jobs/:id/stream` | SSE: `progress`, `token`, `done`, `error` events |

---

## Projects & Files

| Method | Path | Description |
| --- | --- | --- |
| `GET`    | `/projects` | List (filters: `type, classLevel, subject, folderId, q`) |
| `GET`    | `/projects/:id` | Get one (with content) |
| `PATCH`  | `/projects/:id` | Rename / move / edit params |
| `POST`   | `/projects/:id/duplicate` | Duplicate |
| `DELETE` | `/projects/:id` | Delete |
| `POST`   | `/projects/:id/export` | Body `{ format: PDF\|DOCX\|PPTX }` → returns download URL |
| `GET`    | `/exports/:id/download` | Stream the rendered file |

---

## Folders

| Method | Path | Description |
| --- | --- | --- |
| `GET`    | `/folders` | Folder tree |
| `POST`   | `/folders` | Create `{ name, parentId? }` |
| `PATCH`  | `/folders/:id` | Rename / move |
| `DELETE` | `/folders/:id` | Delete (cascades) |

---

## Templates

| Method | Path | Description |
| --- | --- | --- |
| `GET`    | `/templates` | List user + public templates |
| `POST`   | `/templates` | Save `{ name, type, config }` |
| `DELETE` | `/templates/:id` | Delete |

---

## Search

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/search?q=&class=&subject=&chapter=&type=` | Unified search across projects |

---

## Status codes

`200` ok · `201` created · `202` accepted (generation queued) · `400` validation ·
`401` unauthorized · `403` forbidden · `404` not found · `409` conflict ·
`429` rate limited · `500` server error.
