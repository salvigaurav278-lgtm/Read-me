import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { optimizeForPdf } from "@/lib/generators/imageOptimize";
import { writeImageCache } from "@/lib/generators/imageCache";
import { conceptExists } from "@/lib/generators/diagramRegistry";

export const runtime = "nodejs";
export const maxDuration = 60;

function slugify(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/**
 * Upload one or many diagram images. Single: pass `id` + one `files` entry.
 * Bulk: pass many `files`; each file's name (minus extension, slugified) is the
 * concept id it maps to. All images are optimised to print-quality PNG.
 */
export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const form = await req.formData();
  const explicitId = (form.get("id") as string | null)?.trim() || null;
  const license = ((form.get("license") as string) || "Provided by admin").trim();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

  const results: {
    id: string;
    ok: boolean;
    known?: boolean;
    width?: number;
    reason?: string;
  }[] = [];

  for (const file of files) {
    const id = explicitId || slugify(file.name);
    if (!id) {
      results.push({ id: file.name, ok: false, reason: "could not derive an id" });
      continue;
    }
    if (file.type && !ACCEPTED.includes(file.type)) {
      results.push({ id, ok: false, reason: `unsupported type ${file.type}` });
      continue;
    }
    if (file.size > 15 * 1024 * 1024) {
      results.push({ id, ok: false, reason: "file too large (>15MB)" });
      continue;
    }
    const input = Buffer.from(await file.arrayBuffer());
    const opt = await optimizeForPdf(input);
    if (!opt) {
      results.push({ id, ok: false, reason: "could not process/optimise image" });
      continue;
    }
    const ok = await writeImageCache(id, opt.buf, {
      source: "Admin upload",
      license,
      sourceUrl: "admin-upload",
      width: opt.width,
      height: opt.height,
      mime: "image/png",
      fetchedAt: new Date().toISOString(),
      approved: true,
    });
    results.push({ id, ok, known: conceptExists(id), width: opt.width });
  }

  return NextResponse.json({ results });
}
