import { createFileRoute, useRouter } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import {
  ArrowRightLeft,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  Search,
  Tag,
  Video,
  X,
} from "lucide-react";
import { Suspense, lazy, useCallback, useEffect, useId, useState } from "react";
import { DeleteGalleryItemButton } from "@/components/delete-gallery-item-button";
import { Button } from "@/components/ui/button";
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

const TvVideoPlayer = lazy(() =>
  import("@/components/tv-video-player").then((module) => ({ default: module.TvVideoPlayer })),
);

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
  return name.replace(/\.[^.]+$/, "").trim();
}

function ItemCard({ item, allCategories }: { item: GalleryItem; allCategories: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative flex h-full min-h-72 flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-right shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/35 active:scale-[0.98] 2xl:min-h-80"
          aria-label={`عرض ${isVideo ? "الفيديو" : "الصورة"}: ${title}`}
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted/30 sm:aspect-[4/3] xl:aspect-[4/5] 2xl:aspect-[4/3]">
            {thumbnailFailed ? (
              <span className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted via-secondary to-muted text-muted-foreground">
                <Video className="size-10" />
                <span className="text-xs font-medium">Thumbnail غير متاح</span>
              </span>
            ) : (
              <img
                src={item.thumb}
                alt={title}
                loading="lazy"
                decoding="async"
                onError={() => setThumbnailFailed(true)}
                className="size-full object-cover transition duration-300 group-hover:scale-[1.04]"
              />
            )}
            <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[0.68rem] font-medium text-white shadow-sm backdrop-blur-md">
              {isVideo ? <Video className="size-3" /> : <Camera className="size-3" />}
              <span>{isVideo ? "فيديو" : "صورة"}</span>
            </span>
            {isVideo && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition duration-200 group-hover:scale-110 group-hover:bg-primary 2xl:size-14">
                  <Play className="ml-0.5 size-6 fill-current" />
                </span>
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-between p-3.5 2xl:p-4">
            <div>
              <h3
                className="line-clamp-2 font-display text-sm font-semibold leading-tight text-foreground transition group-hover:text-primary 2xl:text-lg"
                title={title}
              >
                {title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-muted-foreground 2xl:text-sm">
                {item.date ? (
                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                    <Calendar className="size-3 shrink-0 text-primary/80" />
                    <span>{item.date}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground/70">بدون تاريخ</span>
                )}
                <span>·</span>
                <span className="font-medium text-primary">{isVideo ? "فيديو" : "صورة"}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
              <span
                className="inline-block max-w-[70%] truncate rounded bg-secondary/80 px-2.5 py-1 text-[0.7rem] font-medium text-secondary-foreground"
                title={item.category}
              >
                {item.category}
              </span>
              <span className="text-[0.7rem] font-medium text-primary opacity-70 transition group-hover:opacity-100">
                عرض ←
              </span>
            </div>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] w-[94vw] max-w-2xl overflow-y-auto rounded-2xl border-border/80 bg-card p-0 shadow-2xl 2xl:max-w-6xl [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:size-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-black/65 [&>button:last-child]:text-white [&>button:last-child]:opacity-90 [&>button:last-child]:backdrop-blur-md [&>button:last-child]:hover:bg-black/80 sm:[&>button:last-child]:right-4 sm:[&>button:last-child]:top-4">
        <div className="relative flex max-h-[58dvh] w-full items-center justify-center overflow-hidden bg-black/95 2xl:max-h-[72dvh]">
          {isVideo ? (
            <Suspense
              fallback={
                <div className="flex min-h-[18rem] w-full items-center justify-center bg-black text-sm text-white">
                  جارٍ تجهيز المشغل…
                </div>
              }
            >
              <TvVideoPlayer src={item.url} poster={item.thumb} title={title} loop />
            </Suspense>
          ) : (
            <img
              src={item.fullUrl || item.url}
              alt={title}
              loading="lazy"
              decoding="async"
              className="max-h-[58dvh] w-full object-contain 2xl:max-h-[72dvh]"
            />
          )}
        </div>

        <div className="space-y-4 p-4 text-right sm:p-6 2xl:p-8" dir="rtl">
          <div className="space-y-2">
            <DialogTitle className="break-words font-display text-xl font-bold leading-snug sm:text-2xl 2xl:text-3xl">
              {title}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm 2xl:text-base">
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

          <div className="rounded-xl border border-border/70 bg-secondary/40 p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor={`move-${item.id}`}
                className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground 2xl:text-sm"
              >
                <ArrowRightLeft className="size-3.5 shrink-0 text-primary" />
                نقل إلى كاتيجوري آخر:
              </label>
              <select
                id={`move-${item.id}`}
                value={item.category}
                disabled={moving}
                onChange={(event) => handleMove(event.target.value)}
                className="h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm transition focus:border-primary focus:ring-1 focus:ring-primary sm:w-auto sm:min-w-[220px] 2xl:h-12 2xl:text-base"
              >
                {allCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
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

          {item.canDelete && (
            <div className="flex justify-start border-t border-border/60 pt-4">
              <DeleteGalleryItemButton
                id={item.id}
                itemName={title}
                onDone={() => router.invalidate()}
                trigger={
                  <Button type="button" variant="destructive" className="h-11 px-5 2xl:h-12">
                    حذف من الألبوم
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategorySlider({
  category,
  allCategories,
}: {
  category: { name: string; items: GalleryItem[] };
  allCategories: string[];
}) {
  const headingId = useId();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: "rtl",
    align: "start",
    loop: category.items.length > 1,
    containScroll: "trimSnaps",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(category.items.length > 1);
  const [canNext, setCanNext] = useState(category.items.length > 1);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="mb-12 2xl:mb-16" aria-labelledby={headingId}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 id={headingId} className="font-display text-2xl font-bold 2xl:text-3xl">
            {category.name}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground 2xl:text-sm" aria-live="polite">
            عنصر {selectedIndex + 1} من {category.items.length} · اسحب أو استخدم الأسهم
          </p>
        </div>
        {category.items.length > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              aria-label="السابق"
              className="size-11 2xl:size-12"
            >
              <ChevronRight className="size-5 2xl:size-6" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              aria-label="التالي"
              className="size-11 2xl:size-12"
            >
              <ChevronLeft className="size-5 2xl:size-6" />
            </Button>
          </div>
        )}
      </div>

      <div
        ref={emblaRef}
        className="overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        role="region"
        aria-roledescription="carousel"
        aria-label={`سلايدر ألبوم ${category.name}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            emblaApi?.scrollPrev();
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            emblaApi?.scrollNext();
          }
        }}
      >
        <div className="flex touch-pan-y gap-3 2xl:gap-4">
          {category.items.map((item, index) => (
            <div
              key={item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} من ${category.items.length}`}
              className="min-w-0 shrink-0 grow-0 basis-[88%] sm:basis-[62%] md:basis-[46%] lg:basis-[34%] xl:basis-[29%] 2xl:basis-[24%]"
            >
              <ItemCard item={item} allCategories={allCategories} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryPage() {
  const { categories, counts } = Route.useLoaderData();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const allCategories = Array.from(new Set(categories.map((category) => category.name)));

  const categoryFiltered =
    filter === "All" ? categories : categories.filter((category) => category.name === filter);
  const query = search.trim().toLowerCase();
  const shown = categoryFiltered
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        if (!query) return true;
        const nameMatch = cleanName(item.sourceName).toLowerCase().includes(query);
        const categoryMatch = item.category.toLowerCase().includes(query);
        const dateMatch = (item.date || "").toLowerCase().includes(query);
        return nameMatch || categoryMatch || dateMatch;
      }),
    }))
    .filter((category) => category.items.length > 0);
  const totalMatchingItems = shown.reduce((total, category) => total + category.items.length, 0);

  return (
    <WorldShell>
      <div dir="rtl">
        <PageIntro
          eyebrow="The show"
          title="Gallery"
          text={`سلايدر لكل ألبوم فيه كل الصور والفيديوهات — ${counts.images} صورة و${counts.videos} فيديو في مكان واحد.`}
        />

        <div className="px-5 pb-5 sm:px-8 2xl:px-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث في الصور والفيديوهات بالاسم أو التاريخ…"
                className="h-12 rounded-full border-border bg-card pl-11 pr-11 text-sm shadow-soft transition focus:border-primary 2xl:h-14 2xl:text-base"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
                  aria-label="مسح البحث"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground 2xl:text-sm">
              <span className="rounded-full bg-secondary px-3.5 py-1.5 font-semibold text-secondary-foreground shadow-sm">
                {totalMatchingItems} {totalMatchingItems === 1 ? "عنصر" : "عناصر"}
              </span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="font-medium text-primary underline underline-offset-2 hover:opacity-85"
                >
                  مسح البحث
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="no-scrollbar sticky top-16 z-30 flex gap-2 overflow-x-auto border-y border-border/60 bg-background/90 px-5 py-3 backdrop-blur-xl sm:px-8 2xl:top-20 2xl:px-12 2xl:py-4">
          {["All", ...categories.map((category) => category.name)].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFilter(name)}
              className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 2xl:min-h-12 2xl:px-6 2xl:text-base ${
                filter === name
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="px-5 pb-12 pt-8 sm:px-8 2xl:px-12 2xl:pb-20 2xl:pt-10">
          {shown.map((category) => (
            <CategorySlider key={category.name} category={category} allCategories={allCategories} />
          ))}

          {shown.length === 0 && (
            <div className="py-16 text-center 2xl:py-24">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground 2xl:size-16">
                <Search className="size-7 2xl:size-8" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold 2xl:text-3xl">
                لا توجد نتائج مطابقة
              </h3>
              <p className="mt-2 text-sm text-muted-foreground 2xl:text-lg">
                {search
                  ? `لم نعثر على أي صور أو فيديوهات تطابق "${search}".`
                  : "لا توجد صور أو فيديوهات في هذا التصنيف حاليًا."}
              </p>
              {(search || filter !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("All");
                  }}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 2xl:text-base"
                >
                  عرض كل الصور والفيديوهات
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </WorldShell>
  );
}
