import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRightLeft,
  Calendar,
  Camera,
  Check,
  Play,
  Search,
  Tag,
  Video,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { getGalleryData, moveGalleryItemCategory, type GalleryItem } from "@/lib/gate.functions";

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

function ItemCard({ item, allCategories }: { item: GalleryItem; allCategories: string[] }) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [moveMsg, setMoveMsg] = useState<string | null>(null);

  async function handleMove(newCategory: string) {
    if (!newCategory || newCategory === item.category) return;
    setMoving(true);
    setMoveMsg(null);
    const { ok } = await moveGalleryItemCategory({ data: { id: item.id, category: newCategory } });
    setMoving(false);
    if (ok) {
      setMoveMsg(`تم النقل إلى "${newCategory}" ✓`);
      await router.invalidate();
    } else {
      setMoveMsg("تعذر النقل — يرجى المحاولة ثانية");
    }
  }

  const isVideo = item.kind === "video";
  const title = cleanName(item.sourceName);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-medium active:scale-[0.98]"
        >
          {/* Media thumbnail container */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted/30">
            <img
              src={item.thumb}
              alt={title}
              loading="lazy"
              className="size-full object-cover transition duration-300 group-hover:scale-[1.04]"
            />

            {/* Media type indicator badge */}
            <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[0.68rem] font-medium text-white shadow-sm backdrop-blur-md">
              {isVideo ? (
                <>
                  <Video className="size-3 text-primary-foreground" />
                  <span>فيديو</span>
                </>
              ) : (
                <>
                  <Camera className="size-3 text-primary-foreground" />
                  <span>صورة</span>
                </>
              )}
            </span>

            {/* Video Play Button Overlay */}
            {isVideo && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition duration-200 group-hover:scale-110 group-hover:bg-primary">
                  <Play className="ml-0.5 size-5 fill-current" />
                </span>
              </span>
            )}
          </div>

          {/* Under-photo details: Name, Date, Category */}
          <div className="flex flex-1 flex-col justify-between p-3">
            <div>
              <h3
                className="line-clamp-2 font-display text-sm font-semibold leading-tight text-foreground transition group-hover:text-primary"
                title={title}
              >
                {title}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-muted-foreground">
                {item.date ? (
                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                    <Calendar className="size-3 shrink-0 text-primary/80" />
                    <span>{item.date}</span>
                  </span>
                ) : (
                  <span className="text-[0.68rem] text-muted-foreground/60">بدون تاريخ</span>
                )}
                <span>·</span>
                <span className="font-medium text-primary">
                  {isVideo ? "فيديو" : "صورة"}
                </span>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-[0.7rem]">
              <span
                className="inline-block max-w-[140px] truncate rounded bg-secondary/80 px-2 py-0.5 font-medium text-secondary-foreground"
                title={item.category}
              >
                {item.category}
              </span>
              <span className="text-[0.68rem] font-medium text-primary opacity-0 transition group-hover:opacity-100 sm:inline-block hidden">
                عرض ←
              </span>
            </div>
          </div>
        </button>
      </DialogTrigger>

      {/* Fully responsive Dialog content on mobile phones and desktops */}
      <DialogContent className="w-[94vw] max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl border-border/80 bg-card p-0 shadow-2xl [&>button:last-child]:top-3 [&>button:last-child]:right-3 [&>button:last-child]:size-8 [&>button:last-child]:bg-black/65 [&>button:last-child]:text-white [&>button:last-child]:rounded-full [&>button:last-child]:backdrop-blur-md [&>button:last-child]:opacity-90 [&>button:last-child]:hover:opacity-100 [&>button:last-child]:hover:bg-black/80">
        {/* Media display box */}
        <div className="relative flex max-h-[52dvh] sm:max-h-[66dvh] w-full items-center justify-center overflow-hidden bg-black/95">
          {isVideo ? (
            <video
              src={item.url}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[52dvh] sm:max-h-[66dvh] w-full object-contain"
            />
          ) : (
            <img
              src={item.url}
              alt={title}
              className="max-h-[52dvh] sm:max-h-[66dvh] w-full object-contain"
            />
          )}
        </div>

        {/* Modal footer & metadata */}
        <div className="space-y-3.5 p-4 sm:p-6 text-left">
          <div className="space-y-1">
            <DialogTitle className="font-display text-lg sm:text-2xl font-bold leading-snug break-words">
              {title}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Tag className="size-3 text-primary" />
                {item.category}
              </span>
              {item.date && (
                <span className="inline-flex items-center gap-1 font-medium">
                  · <Calendar className="size-3 text-primary/70" /> {item.date}
                </span>
              )}
              <span>· {isVideo ? "فيديو" : "صورة"}</span>
            </DialogDescription>
          </div>

          {/* Move to another category control */}
          <div className="rounded-xl border border-border/70 bg-secondary/40 p-3 sm:p-3.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor={`move-${item.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
              >
                <ArrowRightLeft className="size-3.5 text-primary shrink-0" />
                نقل إلى كاتيجوري آخر:
              </label>
              <select
                id={`move-${item.id}`}
                value={item.category}
                disabled={moving}
                onChange={(e) => handleMove(e.target.value)}
                className="h-9 w-full sm:w-auto min-w-[200px] rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm transition focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {moving && <p className="mt-2 text-xs text-muted-foreground">جارٍ الحفظ والتحويل…</p>}
            {moveMsg && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Check className="size-3.5 shrink-0" />
                {moveMsg}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GalleryPage() {
  const { categories, counts } = Route.useLoaderData();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const allCategories = Array.from(new Set(categories.map((c) => c.name)));

  // Filter by category tab
  const categoryFiltered =
    filter === "All" ? categories : categories.filter((c) => c.name === filter);

  // Filter items within categories by search term
  const query = search.trim().toLowerCase();
  const shown = categoryFiltered
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        if (!query) return true;
        const nameMatch = cleanName(item.sourceName).toLowerCase().includes(query);
        const catMatch = item.category.toLowerCase().includes(query);
        const dateMatch = (item.date || "").toLowerCase().includes(query);
        return nameMatch || catMatch || dateMatch;
      }),
    }))
    .filter((cat) => cat.items.length > 0);

  const totalMatchingItems = shown.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <WorldShell>
      <PageIntro
        eyebrow="The show"
        title="Gallery"
        text={`A little cinema of Tamim so far — ${counts.images} photos and ${counts.videos} videos, in one happy place.`}
      />

      {/* Search Bar Container */}
      <div className="px-5 pb-5 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في الصور والفيديوهات بالاسم أو التاريخ…"
              className="h-11 rounded-full border-border bg-card pl-10 pr-10 text-sm shadow-soft transition focus:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
            <span className="rounded-full bg-secondary px-3 py-1 font-semibold text-secondary-foreground shadow-sm">
              {totalMatchingItems} {totalMatchingItems === 1 ? "عنصر" : "عناصر"}
            </span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs font-medium text-primary underline underline-offset-2 hover:opacity-85"
              >
                مسح البحث
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-7 sm:px-8">
        {["All", ...categories.map((c) => c.name)].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setFilter(name)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${
              filter === name
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Gallery Grid by Category */}
      <div className="px-5 pb-12 sm:px-8">
        {shown.map((category) => (
          <section key={category.name} className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">{category.name}</h2>
              <span className="text-xs font-medium text-muted-foreground">
                {category.items.length} {category.items.length === 1 ? "عنصر" : "عناصر"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {category.items.map((item) => (
                <ItemCard key={item.id} item={item} allCategories={allCategories} />
              ))}
            </div>
          </section>
        ))}

        {shown.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Search className="size-6" />
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold">لا توجد نتائج مطابقة</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {search
                ? `لم نعثر على أي صور أو فيديوهات تطابق "${search}".`
                : "لا توجد صور أو فيديوهات في هذا التصنيف حالياً."}
            </p>
            {(search || filter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("All");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                عرض كل الصور والفيديوهات
              </button>
            )}
          </div>
        )}
      </div>
    </WorldShell>
  );
}
