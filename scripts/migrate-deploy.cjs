// Applies the Prisma schema to the database during the Vercel build.
//
// Neon's *pooled* endpoint (PgBouncer, transaction mode) doesn't support the
// session-level advisory lock Prisma Migrate uses, so `migrate deploy` can hang
// or fail when DATABASE_URL points at the `-pooler` host. This script derives
// the *direct* host automatically for the migration, so it works whether the
// configured URL is pooled or direct — with no extra env var to set.
//
// IMPORTANT: this step is *best-effort* and must never fail the Vercel build.
// If it returned a non-zero exit code (missing/unreachable DATABASE_URL, a DB
// that's temporarily down, etc.), the whole `next build` would be aborted and
// Vercel would keep serving the *previous* successful deployment instead of the
// new app. We therefore always exit 0; any DB problem is logged loudly here and
// surfaces at runtime (where it's fixable) rather than blocking the deploy.
const { execSync } = require("child_process");

/** Turn a Neon pooled connection string into a direct one for migrations. */
function toDirectUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    // ep-xxx-pooler.<region>.aws.neon.tech  ->  ep-xxx.<region>.aws.neon.tech
    u.hostname = u.hostname.replace("-pooler.", ".");
    // PgBouncer-only param breaks the migration engine; drop it.
    u.searchParams.delete("pgbouncer");
    return u.toString();
  } catch {
    return url; // not a parseable URL — leave as-is
  }
}

function run(cmd, env) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
}

function main() {
  const original = process.env.DATABASE_URL;
  if (!original) {
    console.warn(
      "⚠ DATABASE_URL is not set — skipping migrations. The app will still " +
        "build and deploy; set DATABASE_URL in Vercel and redeploy to create " +
        "the database tables.",
    );
    return;
  }

  const env = { ...process.env, DATABASE_URL: toDirectUrl(original) };

  try {
    run("npx prisma migrate deploy", env);
    console.log("✔ Prisma migrations applied.");
    return;
  } catch {
    console.warn("migrate deploy failed — falling back to `prisma db push`.");
  }

  try {
    run("npx prisma db push --skip-generate", env);
    console.log("✔ Schema pushed.");
  } catch {
    console.warn(
      "⚠ Could not apply the schema (migrate deploy and db push both failed). " +
        "Continuing the build so the app still deploys — check DATABASE_URL " +
        "and the database, then redeploy. DB-backed features will error until " +
        "the schema is applied.",
    );
  }
}

main();
// Never fail the build on a migration problem (see header comment).
process.exit(0);
