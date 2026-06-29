import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { CONTENT_TYPE_LIST } from "@/lib/content-types";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          Real Pathshala AI
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container flex flex-col items-center gap-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-accent px-4 py-1.5 text-sm text-accent-foreground">
            <Sparkles className="size-3.5" /> Powered by Claude — built for CBSE
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Create teaching content in{" "}
            <span className="text-primary">seconds</span>, not hours
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Generate Notes, PPTs, Question Papers, DPPs, Worksheets, PYQs, Mind Maps,
            Lesson Plans and Question Banks for CBSE Class 10, 11 & 12 — then export to
            PDF, DOCX and PPTX.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Start creating <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
            {["8 subjects", "3 classes", "9 content generators", "3 export formats"].map(
              (f) => (
                <span key={f} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" /> {f}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="container grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {CONTENT_TYPE_LIST.map((c) => (
            <Card key={c.type} className="transition-shadow hover:shadow-md">
              <CardContent className="flex gap-4 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon name={c.icon} className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{c.label}</p>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Real Pathshala AI · Built for teachers & coaching institutes
      </footer>
    </div>
  );
}
