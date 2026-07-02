import { redirect } from "next/navigation";
import { Users, FolderKanban, Download, Coins, Image as ImageIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONTENT_TYPE_CONFIG, type ContentType } from "@/lib/content-types";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const [users, projects, exportsCount, tokens, byType, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.projectExport.count(),
    prisma.project.aggregate({ _sum: { tokensUsed: true } }),
    prisma.project.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
  ]);

  const stats = [
    { label: "Users", value: users, icon: Users },
    { label: "Projects", value: projects, icon: FolderKanban },
    { label: "Exports", value: exportsCount, icon: Download },
    { label: "Tokens used", value: (tokens._sum.tokensUsed ?? 0).toLocaleString(), icon: Coins },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Platform usage at a glance.</p>
        </div>
        <a
          href="/admin/diagrams"
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ImageIcon className="size-4" /> Diagram Check
        </a>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content by type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byType.length === 0 ? (
              <p className="text-sm text-muted-foreground">No content generated yet.</p>
            ) : (
              byType
                .sort((a, b) => b._count._all - a._count._all)
                .map((t) => (
                  <div key={t.type} className="flex items-center justify-between text-sm">
                    <span>{CONTENT_TYPE_CONFIG[t.type as ContentType].label.replace(" Generator", "")}</span>
                    <Badge variant="secondary">{t._count._all}</Badge>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Newest users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.role === "ADMIN" && <Badge>Admin</Badge>}
                  <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
