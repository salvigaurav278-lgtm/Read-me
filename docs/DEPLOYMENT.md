# Deployment Guide — Real Pathshala AI

Deploy the app to **Vercel** with a managed **PostgreSQL** database.

---

## 1. Provision a PostgreSQL database

Pick any managed Postgres provider:

- **Neon** — https://neon.tech (recommended; serverless, generous free tier)
- **Supabase** — https://supabase.com
- **Vercel Postgres** — from the Vercel dashboard → Storage

Copy the connection string (it looks like
`postgresql://user:password@host/dbname?sslmode=require`). This is your `DATABASE_URL`.

---

## 2. Push the code to GitHub

```bash
git push -u origin claude/pathshala-ai-content-creator-vlqhye
```

Open the branch (or merge to `main`) in your GitHub repo.

---

## 3. Import the project into Vercel

1. https://vercel.com/new → **Import** your GitHub repository.
2. Framework preset: **Next.js** (auto-detected).
3. Build command: `npm run build` (runs `prisma generate` then `next build`).
4. Add the environment variables below, then **Deploy**.

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Required | Example / Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Your Postgres URL (with `sslmode=require`) |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `AUTH_URL` | ✅ (prod) | `https://your-app.vercel.app` |
| `ANTHROPIC_API_KEY` | ✅* | From https://console.anthropic.com (omit to use mock content) |
| `CLAUDE_MODEL` | ◻︎ | Defaults to `claude-opus-4-8` |
| `AUTH_GOOGLE_ID` | ◻︎ | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | ◻︎ | Google OAuth client secret |
| `ADMIN_EMAILS` | ◻︎ | Comma-separated admin emails |

\* Required for real AI generation.

---

## 4. Run the database migration & seed (once)

From your machine, pointed at the production database:

```bash
DATABASE_URL="<your-prod-url>" npx prisma migrate deploy   # or: npx prisma db push
DATABASE_URL="<your-prod-url>" npm run db:seed
```

> First time only — create the migration locally with `npx prisma migrate dev --name init`
> and commit the `prisma/migrations/` folder so `migrate deploy` has something to apply.

---

## 5. Configure Google OAuth (optional)

1. https://console.cloud.google.com → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
2. **Authorized redirect URI:** `https://your-app.vercel.app/api/auth/callback/google`
3. Copy the client ID/secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` on Vercel and redeploy.

---

## 6. Promote an admin

Sign up with an email listed in `ADMIN_EMAILS`, **or** run the seed (which promotes any
existing user whose email is in `ADMIN_EMAILS`). Admins see the **Admin Panel** in the sidebar.

---

## Notes & troubleshooting

- **Prisma engines on Vercel** — `prisma generate` runs during the build and downloads the
  correct serverless engine automatically. If you hit an engine-target error, add
  `binaryTargets = ["native", "rhel-openssl-3.0.x"]` to the `generator` block in
  `prisma/schema.prisma`.
- **Generation timeouts** — `/api/generate` and the export route set `maxDuration = 60`.
  On Vercel Hobby the function limit is lower; upgrade the plan for long generations or
  switch generation to a background job.
- **Serverless package size** — `pdf-lib`, `pptxgenjs` and `docx` are listed in
  `serverExternalPackages` so they stay out of the client bundle and run on the Node runtime.
