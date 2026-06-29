import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const where: Prisma.ProjectWhereInput = { userId: session.user.id };

  const type = searchParams.get("type");
  const classLevel = searchParams.get("class");
  const subject = searchParams.get("subject");
  const q = searchParams.get("q");
  const saved = searchParams.get("saved");

  if (type) where.type = type as Prisma.ProjectWhereInput["type"];
  if (classLevel) where.classLevel = classLevel as Prisma.ProjectWhereInput["classLevel"];
  if (subject) where.subject = subject as Prisma.ProjectWhereInput["subject"];
  if (saved === "true") where.saved = true;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { chapter: { contains: q, mode: "insensitive" } },
      { topic: { contains: q, mode: "insensitive" } },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      classLevel: true,
      subject: true,
      chapter: true,
      saved: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ projects });
}
