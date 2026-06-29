// Applies the Prisma schema to the database during the Vercel build.
//
// Neon's *pooled* endpoint (PgBouncer, transaction mode) doesn't support the
// session-level advisory lock Prisma Migrate uses, so `migrate deploy` can hang
// or fail when DATABASE_URL points at the `-pooler` host. This script derives
// the *direct* host automatically for the migration, so it works whether the
// configured URL is pooled or direct — with no extra env var to set.
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

const original = process.env.DATABASE_URL;
if (!original) {
  console.error("DATABASE_URL is not set — cannot run migrations.");
  process.exit(1);
}

const migrateUrl = toDirectUrl(original);
const env = { ...process.env, DATABASE_URL: migrateUrl };

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
}

try {
  run("npx prisma migrate deploy");
  console.log("✔ Prisma migrations applied.");
} catch {
  console.warn("migrate deploy failed — falling back to `prisma db push`.");
  run("npx prisma db push --skip-generate");
  console.log("✔ Schema pushed.");
}
