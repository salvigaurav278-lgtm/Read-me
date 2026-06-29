import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportSchema } from "@/lib/validation";
import { generatedContentSchema } from "@/lib/ai/schemas";
import { renderExport, mimeFor, extFor } from "@/lib/generators";
import { slugify } from "@/lib/utils";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (project.status !== "READY" || !project.content) {
    return NextResponse.json({ error: "Content is not ready yet" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid format" }, { status: 400 });

  const content = generatedContentSchema.safeParse(project.content);
  if (!content.success) {
    return NextResponse.json({ error: "Stored content is corrupt" }, { status: 422 });
  }

  const format = parsed.data.format;
  const buffer = await renderExport(format, content.data);
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
    },
  });
}
