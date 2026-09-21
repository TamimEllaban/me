import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookHeart, CalendarDays, Sprout, Users } from "lucide-react";
import hero from "@/assets/hero-child.jpg";
import { WorldShell } from "@/components/world-shell";
import { getHomeData } from "@/lib/gate.functions";

export const Route = createFileRoute("/")({
  loader: () => getHomeData(),
  head: () => ({
    meta: [
      { title: "Tamim's World — Our family memory capsule" },
      {
        name: "description",
        content:
          "A private collection of childhood memories, family stories, and letters for the future.",
      },
      { property: "og:title", content: "Tamim's World" },
      { property: "og:description", content: "A private family memory capsule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function formatBornDate(iso: string) {
  const parts = iso.slice(0, 10).split("-").map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AgeCounter({ birthdate }: { birthdate: string }) {
  const born = new Date(birthdate);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  let days = now.getDate() - born.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return (
    <div className="grid grid-cols-3 divide-x divide-border rounded-lg bg-background/92 py-4 text-foreground shadow-keepsake backdrop-blur">
      <div className="px-2 text-center">
        <b className="block font-display text-2xl">{years}</b>
        <span className="text-[0.68rem] text-muted-foreground">years</span>
      </div>
      <div className="px-2 text-center">
        <b className="block font-display text-2xl">{months}</b>
        <span className="text-[0.68rem] text-muted-foreground">months</span>
      </div>
      <div className="px-2 text-center">
        <b className="block font-display text-2xl">{days}</b>
        <span className="text-[0.68rem] text-muted-foreground">days</span>
      </div>
    </div>
  );
}

function HomePage() {
  const { child, memories } = Route.useLoaderData();
  const nav = [
    { to: "/memories" as const, title: "Memories", copy: "Every little first", icon: BookHeart },
    {
      to: "/family-tree" as const,
      title: "Family tree",
      copy: "The roots that hold you",
      icon: Sprout,
    },
    {
      to: "/relatives" as const,
      title: "Your people",
      copy: "Everyone who loves you",
      icon: Users,
    },
  ];
  const heroImage = child.hero_image ?? hero;
  return (
    <WorldShell>
      <section className="relative min-h-[70svh] overflow-hidden sm:mx-6 sm:mt-6 sm:min-h-[36rem] sm:rounded-xl">
        <img
          src={heroImage}
          alt="A joyful child in a warm sunlit room"
          width={1200}
          height={1504}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-hero-wash" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-8 text-white sm:px-10 sm:pb-10">
          <p className="mb-2 flex items-center gap-2 text-sm">
            <CalendarDays className="size-4" />
            Born {formatBornDate(child.birthdate)}
          </p>
          <h1 className="font-display text-5xl leading-none sm:text-7xl">
            {child.name}'s
            <br />
            World
          </h1>
          <div className="mt-6 max-w-md text-center">
            <AgeCounter birthdate={child.birthdate} />
          </div>
        </div>
      </section>
      <section className="px-5 py-10 sm:px-8">
        <p className="max-w-xl font-display text-2xl leading-relaxed sm:text-3xl">
          “{child.welcome}”
        </p>
        <div className="mt-9 grid gap-3 sm:grid-cols-3">
          {nav.map(({ to, title, copy, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex min-h-28 items-center justify-between rounded-lg border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-keepsake"
            >
              <span>
                <Icon className="mb-3 size-5 text-primary" />
                <b className="block font-display text-xl">{title}</b>
                <span className="text-xs text-muted-foreground">{copy}</span>
              </span>
              <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-secondary/45 px-5 py-10 sm:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Recently remembered</p>
            <h2 className="mt-1 font-display text-3xl">Little chapters</h2>
          </div>
          <Link to="/memories" className="text-sm font-semibold text-primary">
            View all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {memories.map((m) => (
            <Link
              to="/memories"
              key={m.id}
              className="overflow-hidden rounded-lg bg-card shadow-soft"
            >
              <img
                src={m.image}
                alt=""
                width={1200}
                height={912}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-4">
                <p className="text-xs text-primary">{m.date}</p>
                <h3 className="mt-1 font-display text-xl">{m.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </WorldShell>
  );
}
