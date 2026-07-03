-- Track whether a project's content was mock (no GEMINI_API_KEY) vs real Gemini.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "mocked" BOOLEAN NOT NULL DEFAULT false;
