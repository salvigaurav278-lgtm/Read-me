import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSchema } from "@/lib/validation";
import { generateContent } from "@/lib/ai/client";
import { CONTENT_TYPE_CONFIG } from "@/lib/content-types";
import { SUBJECT_LABELS } from "@/lib/curriculum";

// Generation can take a while; allow a generous server timeout on Vercel.
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const fallbackTitle = `${input.chapter || CONTENT_TYPE_CONFIG[input.type].label} — ${SUBJECT_LABELS[input.subject]}`;

  const project = await prisma.project.create({
    data: {
      userId: session.user.id,
      title: fallbackTitle,
      type: input.type,
      status: "GENERATING",
      classLevel: input.classLevel,
      subject: input.subject,
      chapter: input.chapter ?? null,
      topic: input.topic ?? null,
      params: input.params as Prisma.InputJsonValue,
    },
  });

  try {
    const result = await generateContent({
      type: input.type,
      classLevel: input.classLevel,
      subject: input.subject,
      chapter: input.chapter,
      topic: input.topic,
      params: input.params,
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "READY",
        title: result.content.title || fallbackTitle,
        content: result.content as unknown as Prisma.InputJsonValue,
        tokensUsed: result.tokensUsed,
      },
    });

    return NextResponse.json({ id: project.id, mocked: result.mocked }, { status: 201 });
  } catch (err) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "FAILED", error: (err as Error).message },
    });
    return NextResponse.json(
      { error: "Generation failed. Please try again.", id: project.id },
      { status: 500 },
    );
  }
}
