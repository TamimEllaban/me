import { Link, useRouterState } from "@tanstack/react-router";
import { Baby, BookHeart, Camera, Home, Mail, Share2, Sprout, Users } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const tabs = [
  { to: "/" as const, label: "Home", icon: Home },
  { to: "/memories" as const, label: "Memories", icon: BookHeart },
  { to: "/family-tree" as const, label: "Family", icon: Sprout },
  { to: "/relatives" as const, label: "Relatives", icon: Users },
  { to: "/letters" as const, label: "Letters", icon: Mail },
];

export function WorldShell({
  children,
  title = "Tamim's World",
}: {
  children: ReactNode;
  title?: string;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Baby className="size-5 text-primary" />
            {title}
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/manage"
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="Manage family photos"
              title="Manage photos"
            >
              <Camera className="size-4" />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Share with family"
              title="Share with family"
              onClick={() => navigator.share?.({ title, url: window.location.href })}
            >
              <Share2 />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Change color theme"
              title="Change color theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <span aria-hidden className="text-base">
                {theme === "light" ? "☾" : "☀"}
              </span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl pb-28 md:pb-12">{children}</main>
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:left-1/2 md:bottom-5 md:w-fit md:-translate-x-1/2 md:rounded-full md:border md:px-2 md:shadow-keepsake"
      >
        <div className="mx-auto grid h-[4.75rem] max-w-lg grid-cols-5 md:h-16 md:w-[31rem]">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium transition-transform active:scale-95 ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className={`size-5 ${active ? "fill-primary/15" : ""}`} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="px-5 pb-7 pt-8 sm:px-8">
      <p className="mb-2 text-xs font-semibold uppercase text-primary">{eyebrow}</p>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{text}</p>
    </div>
  );
}
