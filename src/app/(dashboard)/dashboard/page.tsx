import Link from "next/link";
import { NotebookPen, FileCheck2, Presentation, Download, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ProjectCard, type ProjectSummary } from "@/components/dashboard/project-card";
import { CONTENT_TYPE_LIST } from "@/lib/content-types";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [notes, tests, ppts, exportsCount, recent] = await Promise.all([
    prisma.project.count({ where: { userId, type: "NOTES" } }),
    prisma.project.count({ where: { userId, type: { in: ["TEST", "WORKSHEET", "DPP"] } } }),
    prisma.project.count({ where: { userId, type: "PPT" } }),
    prisma.projectExport.count({ where: { project: { userId } } }),
    prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 6,
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
    }),
  ]);

  const stats = [
    { label: "Notes", value: notes, icon: NotebookPen },
    { label: "Tests & Practice", value: tests, icon: FileCheck2 },
    { label: "Presentations", value: ppts, icon: Presentation },
    { label: "Downloads", value: exportsCount, icon: Download },
  ];

  const recentProjects: ProjectSummary[] = recent.map((p) => ({
    ...p,
    updatedAt: p.updatedAt.toISOString(),
  }));

  const quickActions = CONTENT_TYPE_LIST.slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-muted-foreground">Pick a generator or continue where you left off.</p>
        </div>
        <Button asChild>
          <Link href="/generate/notes">
            <Plus className="size-4" /> New content
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((c) => (
            <Link
              key={c.slug}
              href={`/generate/${c.slug}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon name={c.icon} className="size-5" />
              </span>
              <div>
                <p className="font-medium">{c.label.replace(" Generator", "")}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently created</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">View all</Link>
          </Button>
        </div>
        {recentProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Nothing yet — generate your first piece of content above.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
