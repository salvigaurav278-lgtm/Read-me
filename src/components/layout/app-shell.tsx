"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Sparkles,
  LayoutDashboard,
  History,
  Bookmark,
  Shield,
  Search,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTENT_TYPE_LIST } from "@/lib/content-types";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShellUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin: boolean;
}

function NavLink({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const close = () => setOpen(false);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    router.push(`/history?q=${encodeURIComponent(String(q ?? ""))}`);
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-3">
      <Link href="/dashboard" onClick={close} className="mb-3 flex items-center gap-2 px-2 py-2 font-bold">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        Real Pathshala
      </Link>

      <NavLink href="/dashboard" active={isActive("/dashboard")} onClick={close}>
        <LayoutDashboard className="size-4" /> Dashboard
      </NavLink>

      <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Generators
      </p>
      {CONTENT_TYPE_LIST.map((c) => {
        const href = `/generate/${c.slug}`;
        return (
          <NavLink key={c.slug} href={href} active={isActive(href)} onClick={close}>
            <Icon name={c.icon} className="size-4" /> {c.label.replace(" Generator", "")}
          </NavLink>
        );
      })}

      <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Library
      </p>
      <NavLink href="/history" active={isActive("/history")} onClick={close}>
        <History className="size-4" /> History
      </NavLink>
      <NavLink href="/saved" active={isActive("/saved")} onClick={close}>
        <Bookmark className="size-4" /> Saved Files
      </NavLink>
      {user.isAdmin && (
        <NavLink href="/admin" active={isActive("/admin")} onClick={close}>
          <Shield className="size-4" /> Admin Panel
        </NavLink>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r bg-card">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" onClick={close} aria-label="Close menu">
                <X className="size-4" />
              </Button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          <form onSubmit={onSearch} className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              placeholder="Search by class, subject, chapter, topic…"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </form>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[10rem] truncate text-sm sm:block">
                    {user.name ?? user.email}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
