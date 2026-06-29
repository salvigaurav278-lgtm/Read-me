import { ProjectsView } from "@/components/dashboard/projects-view";

export default function SavedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Files</h1>
        <p className="text-muted-foreground">Your bookmarked projects, ready to export anytime.</p>
      </div>
      <ProjectsView savedOnly />
    </div>
  );
}
