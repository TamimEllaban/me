import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { getGalleryData, type GalleryItem } from "@/lib/gate.functions";

export const Route = createFileRoute("/gallery")({
  loader: () => getGalleryData(),
  head: () => ({
    meta: [
      { title: "Gallery — Tamim's World" },
      {
        name: "description",
        content: "Every photo and video of Tamim so far, in one happy place.",
      },
      { property: "og:title", content: "Gallery — Tamim's World" },
      { property: "og:description", content: "Every photo and video of Tamim so far." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});

function cleanName(name: string) {
  return name.replace(/\.(jpg|jpeg|mp4)$/i, "").trim();
}

function ItemCard({ item }: { item: GalleryItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="group relative block w-full overflow-hidden rounded-lg bg-card shadow-soft transition active:scale-[0.98]">
          <div className="aspect-[4/5] w-full">
            <img
              src={item.thumb}
              alt={cleanName(item.sourceName)}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            />
          </div>
          {item.kind === "video" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition group-hover:bg-primary">
                <Play className="size-5 fill-current" />
              </span>
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[88svh] overflow-y-auto gap-3 p-0 sm:max-w-2xl sm:p-0">
        {item.kind === "video" ? (
          <video
            src={item.url}
            controls
            autoPlay
            loop
            playsInline
            className="max-h-[70svh] w-full bg-black"
          />
        ) : (
          <img src={item.url} alt="" className="max-h-[70svh] w-full object-contain bg-black" />
        )}
        <div className="px-5 pb-5">
          <DialogTitle className="font-display text-xl">{cleanName(item.sourceName)}</DialogTitle>
          <DialogDescription className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {item.category}
            {item.date && <span>· {item.date}</span>}
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GalleryPage() {
  const { categories, counts } = Route.useLoaderData();
  const [filter, setFilter] = useState("All");
  const shown = filter === "All" ? categories : categories.filter((c) => c.name === filter);

  return (
    <WorldShell>
      <PageIntro
        eyebrow="The show"
        title="Gallery"
        text={`A little cinema of Tamim so far — ${counts.images} photos and ${counts.videos} videos, in one happy place.`}
      />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-7 sm:px-8">
        {["All", ...categories.map((c) => c.name)].map((name) => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${filter === name ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="px-5 pb-12 sm:px-8">
        {shown.map((category) => (
          <section key={category.name} className="mb-12">
            <h2 className="mb-4 font-display text-2xl">{category.name}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {category.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
        {shown.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No photos or videos yet.
          </p>
        )}
      </div>
    </WorldShell>
  );
}
