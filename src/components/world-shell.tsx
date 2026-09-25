import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Baby,
  BookHeart,
  Camera,
  Clapperboard,
  Home,
  LogOut,
  Mail,
  Settings,
  Share2,
  Sprout,
  Users,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { lockSite } from "@/lib/gate.functions";

const tabs = [
  { to: "/" as const, label: "Home", icon: Home },
  { to: "/memories" as const, label: "Memories", icon: BookHeart },
  { to: "/gallery" as const, label: "Gallery", icon: Clapperboard },
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
  const router = useRouter();
  const lock = useServerFn(lockSite);
  const [loggingOut, setLoggingOut] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await lock();
      await router.navigate({ to: "/unlock" });
      router.invalidate();
    } catch {
      window.location.href = "/unlock";
    } finally {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return (
    <div className="site-frame min-h-screen min-h-[100dvh] bg-background text-foreground">
      <header className="site-header sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="site-header-inner mx-auto flex h-16 max-w-[100rem] items-center justify-between px-4 sm:px-6 2xl:h-20 2xl:px-12">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 2xl:gap-3 2xl:text-2xl"
          >
            <Baby className="size-5 text-primary" />
            {title}
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/manage"
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 active:scale-95 2xl:h-12 2xl:px-5 2xl:text-sm"
              aria-label="Add or change family photos"
              title="Add or change family photos"
            >
              <Camera className="size-4 text-primary 2xl:size-5" />
              <span className="hidden sm:inline">Add photos</span>
            </Link>
            <Link
              to="/admin/settings/storage"
              className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 active:scale-95 2xl:size-12"
              aria-label="Cloudinary storage settings"
              title="Storage settings"
            >
              <Settings className="size-4 2xl:size-5" />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Share with family"
              title="Share with family"
              onClick={() => navigator.share?.({ title, url: window.location.href })}
              className="2xl:size-12"
            >
              <Share2 />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Change color theme"
              title="Change color theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="2xl:size-12"
            >
              <span aria-hidden className="text-base">
                {theme === "light" ? "☾" : "☀"}
              </span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Sign out and lock site"
              title="Sign out / Lock site"
              disabled={loggingOut}
              onClick={handleLogout}
              className="text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive 2xl:size-12"
            >
              <LogOut className={`size-4 ${loggingOut ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>
      <main className="site-main mx-auto max-w-[100rem] pb-28 md:pb-12 2xl:pb-28">{children}</main>
      <nav
        aria-label="Main navigation"
        className="site-nav fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:left-1/2 md:bottom-5 md:w-fit md:-translate-x-1/2 md:rounded-full md:border md:px-2 md:shadow-keepsake 2xl:bottom-6 2xl:rounded-[2rem] 2xl:px-3"
      >
        <div className="site-nav-inner mx-auto grid h-[4.75rem] max-w-lg grid-cols-6 md:h-16 md:w-[38rem] 2xl:h-24 2xl:w-[76rem]">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`site-nav-link flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-[0.68rem] font-medium transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 active:scale-95 2xl:gap-2 2xl:text-base ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
              >
                <Icon className={`size-5 2xl:size-7 ${active ? "fill-primary/15" : ""}`} />
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
    <div className="px-5 pb-7 pt-8 sm:px-8 2xl:px-12 2xl:pb-10 2xl:pt-10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary 2xl:text-sm">
        {eyebrow}
      </p>
      <h1 className="font-display text-[clamp(2.5rem,4.5vw,4.5rem)] leading-tight">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base 2xl:text-lg 2xl:leading-7">
        {text}
      </p>
    </div>
  );
}
