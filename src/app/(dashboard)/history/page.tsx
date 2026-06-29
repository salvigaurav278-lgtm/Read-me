import { ProjectsView } from "@/components/dashboard/projects-view";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">Everything you&apos;ve generated, searchable and filterable.</p>
      </div>
      <ProjectsView initialQuery={q ?? ""} />
    </div>
  );
}
