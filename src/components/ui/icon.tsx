import {
  NotebookPen,
  Presentation,
  FileCheck2,
  ClipboardList,
  CalendarCheck,
  History,
  Network,
  CalendarRange,
  Library,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

// Map of icon names referenced in the content-type registry → components.
const ICONS: Record<string, LucideIcon> = {
  NotebookPen,
  Presentation,
  FileCheck2,
  ClipboardList,
  CalendarCheck,
  History,
  Network,
  CalendarRange,
  Library,
  LayoutDashboard,
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? Library;
  return <Cmp className={className} />;
}
