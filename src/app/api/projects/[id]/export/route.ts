import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportSchema } from "@/lib/validation";
import { generatedContentSchema } from "@/lib/ai/schemas";
import { noteStyleAllowsDiagrams } from "@/lib/ai/prompts";
import {
  renderExport,
  mimeFor,
  extFor,
  type ExportFormat,
} from "@/lib/generators";
import { slugify } from "@/lib/utils";
import {
  CLASS_LABELS,
  SUBJECT_LABELS,
  type ClassLevel,
  type Subject,
} from "@/lib/curriculum";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Render the file for a project, or return a JSON error response. */
async function buildExport(
  id: string,
  userId: string,
  format: ExportFormat,
  images = true,
): Promise<NextResponse> {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (project.status !== "READY" || !project.content) {
    return NextResponse.json({ error: "Content is not ready yet" }, { status: 409 });
  }

  const content = generatedContentSchema.safeParse(project.content);
  if (!content.success) {
    return NextResponse.json({ error: "Stored content is corrupt" }, { status: 422 });
  }

  // Some note styles (Short / Revision / Formula Sheet) are text-only.
  const styleAllowsDiagrams =
    project.type !== "NOTES" ||
    noteStyleAllowsDiagrams((project.params as { style?: unknown } | null)?.style);

  let buffer: Buffer;
  try {
    buffer = await renderExport(format, content.data, {
      className: CLASS_LABELS[project.classLevel as ClassLevel],
      subject: SUBJECT_LABELS[project.subject as Subject],
      chapter: project.chapter ?? undefined,
      projectId: project.id,
      images: images && styleAllowsDiagrams,
    });
  } catch (err) {
    console.error("export render failed", err);
    return NextResponse.json(
      { error: `Could not render ${format}: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  const fileName = `${slugify(project.title) || "document"}.${extFor(format)}`;

  await prisma.projectExport.create({
    data: { projectId: project.id, format, fileName },
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mimeFor(format),
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}

// GET — navigation-based download (reliable on mobile browsers & WebViews).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const images = url.searchParams.get("images") !== "0";
  const parsed = exportSchema.safeParse({ format });
  if (!parsed.success) return NextResponse.json({ error: "Invalid format" }, { status: 400 });

  return buildExport(id, session.user.id, parsed.data.format, images);
}

// POST — used by the native (Capacitor) path which fetches the bytes directly.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  const images = body?.images !== false;

  return buildExport(id, session.user.id, parsed.data.format, images);
}
