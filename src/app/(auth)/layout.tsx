import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        Real Pathshala AI
      </Link>
      {children}
    </div>
  );
}
