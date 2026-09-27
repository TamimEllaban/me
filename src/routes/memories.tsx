import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { getMemoriesData } from "@/lib/gate.functions";

export const Route = createFileRoute("/memories")({
  loader: () => getMemoriesData(),
  head: () => ({
    meta: [
      { title: "Memories — Tamim's World" },
      {
        name: "description",
        content: "A private timeline of childhood milestones and everyday moments.",
      },
      { property: "og:title", content: "Memories — Tamim's World" },
      { property: "og:description", content: "A private timeline of childhood moments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoriesPage,
});
function MemoriesPage() {
  const { memories } = Route.useLoaderData();
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...new Set(memories.map((m) => m.category))];
  const shown = filter === "All" ? memories : memories.filter((m) => m.category === filter);
  return (
    <WorldShell>
      <PageIntro
        eyebrow="Every chapter"
        title="Memories"
        text="The milestones, ordinary afternoons, and tiny details we never want to forget."
      />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-7 sm:px-8 sm:justify-center 2xl:px-12">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${filter === category ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="relative mx-auto max-w-[90rem] px-5 pb-10 sm:px-8 2xl:px-12">
        <div className="absolute bottom-10 left-[2.45rem] top-0 w-[0.0625rem] bg-border sm:left-[3.45rem]" />
        {shown.map((memory) => (
          <Dialog key={memory.id}>
            <DialogTrigger asChild>
              <button className="relative mb-7 block w-full pl-10 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 sm:pl-14 2xl:pl-16">
                <span className="absolute left-[0.68rem] top-5 size-3 rounded-full border-[0.1875rem] border-background bg-primary sm:left-[0.67rem]" />
                <article className="overflow-hidden rounded-lg bg-card shadow-soft transition active:scale-[0.99] sm:grid sm:grid-cols-[14rem_1fr] 2xl:grid-cols-[19rem_1fr]">
                  <img
                    src={memory.image}
                    alt=""
                    width={1200}
                    height={912}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                  <div className="p-5 2xl:p-8">
                    <span className="text-xs font-semibold text-primary">
                      {memory.date} · {memory.category}
                    </span>
                    <h2 className="mt-2 font-display text-2xl">{memory.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{memory.excerpt}</p>
                    <span className="mt-4 inline-block text-xs font-semibold text-primary">
                      Tap to remember more
                    </span>
                  </div>
                </article>
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] w-[94vw] max-w-lg overflow-y-auto p-0 sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl rounded-2xl border-border/80 bg-card shadow-2xl">
              <div className="relative flex max-h-[50dvh] sm:max-h-[58dvh] 2xl:max-h-[66dvh] w-full items-center justify-center overflow-hidden bg-black/95">
                <img
                  src={memory.image}
                  alt=""
                  width={1200}
                  height={912}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[50dvh] sm:max-h-[58dvh] 2xl:max-h-[66dvh] w-full object-contain"
                />
              </div>
              <div className="p-5 sm:p-6 2xl:p-8">
                <p className="text-xs font-semibold text-primary">{memory.date}</p>
                <DialogTitle className="mt-2 font-display text-2xl sm:text-3xl 2xl:text-4xl">{memory.title}</DialogTitle>
                <DialogDescription className="mt-4 text-sm sm:text-base 2xl:text-lg leading-relaxed text-muted-foreground">
                  {memory.story}
                </DialogDescription>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </WorldShell>
  );
}
