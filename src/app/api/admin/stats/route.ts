import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, projects, exports, tokens, byType] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.projectExport.count(),
    prisma.project.aggregate({ _sum: { tokensUsed: true } }),
    prisma.project.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  return NextResponse.json({
    users,
    projects,
    exports,
    tokensUsed: tokens._sum.tokensUsed ?? 0,
    byType: byType.map((t) => ({ type: t.type, count: t._count._all })),
  });
}
