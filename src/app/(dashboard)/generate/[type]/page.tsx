import { notFound } from "next/navigation";
import { typeFromSlug, CONTENT_TYPE_CONFIG } from "@/lib/content-types";
import { Icon } from "@/components/ui/icon";
import { GeneratorForm } from "@/components/generators/generator-form";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: slug } = await params;
  const type = typeFromSlug(slug);
  if (!type) notFound();

  const cfg = CONTENT_TYPE_CONFIG[type];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon name={cfg.icon} className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{cfg.label}</h1>
          <p className="text-muted-foreground">{cfg.description}</p>
        </div>
      </div>

      <GeneratorForm type={type} />
    </div>
  );
}
