import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Clapperboard,
  CloudUpload,
  FileVideo,
  Home,
  Images,
  ImagePlus,
  Link2,
  Play,
  Plus,
  Save,
  Search,
  Sprout,
  Tag,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DeleteGalleryItemButton } from "@/components/delete-gallery-item-button";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { UploadBusyOverlay } from "@/components/upload-busy-overlay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteFamilyPhoto,
  getGalleryData,
  getHomeData,
  getMemoriesData,
  getRelativesData,
  listFamilyPhotos,
  moveGalleryItemCategory,
  setFamilyDetails,
  setFamilyPhoto,
  updateMemoryEntry,
  updateRelativeEntry,
} from "@/lib/gate.functions";
import { cloudinaryVideoThumbnailUrl } from "@/lib/media-urls";
import {
  getMediaKind,
  isSupportedMediaFile,
  uploadMediaDirect,
  type UploadedMedia,
} from "@/lib/photo-upload";

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DEFAULT_GALLERY_CATEGORIES = [
  "01 - يوم الولاده",
  "02 - السبوع والعقيقه",
  "03 - تميم وهو صغير",
  "04 - المناسبات",
  "05 - الرحلات",
  "06 - العمره",
  "07 - مع العيله",
  "08 - اللعب والانشطه",
  "09 - الاكل",
  "10 - يوميات وصحه",
  "00 - زفاف الوالدين",
];

const DEFAULT_MEMORY_CATEGORIES = ["Milestones", "Celebrations", "Everyday moments", "Adventures"];

async function loadManage() {
  const [home, memories, relatives, gallery] = await Promise.all([
    getHomeData(),
    getMemoriesData(),
    getRelativesData(),
    getGalleryData(),
  ]);
  const photos = await listFamilyPhotos();
  const galleryCategories = Array.from(
    new Set([...DEFAULT_GALLERY_CATEGORIES, ...gallery.categories.map((c) => c.name)]),
  );
  const allGalleryItems = gallery.categories.flatMap((c) => c.items);
  return {
    child: home.child,
    memories: memories.memories,
    relatives: relatives.relatives,
    photos: photos.photos,
    galleryCategories,
    galleryItems: allGalleryItems,
  };
}

type LoaderData = Awaited<ReturnType<typeof loadManage>>;

export const Route = createFileRoute("/manage")({
  loader: loadManage,
  head: () => ({
    meta: [{ title: "Family album — Tamim's World" }, { name: "robots", content: "noindex" }],
  }),
  component: ManagePage,
});

type QueuedMedia = {
  id: string;
  file: File;
  kind: "image" | "video";
  name: string;
  previewUrl: string;
};

const MAX_BATCH_FILES = 30;

function mediaName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Family media";
}

function queuedMediaId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeQueuedMedia(file: File): QueuedMedia {
  return {
    id: queuedMediaId(),
    file,
    kind: getMediaKind(file),
    name: mediaName(file),
    previewUrl: URL.createObjectURL(file),
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function successfulIndexesFrom<T>(results: Array<T | null>): number[] {
  return results.map((result, index) => (result ? index : -1)).filter((index) => index >= 0);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
      {n}
    </span>
  );
}

const places = [
  {
    kind: "hero" as const,
    title: "Front page",
    copy: "The big photo everyone sees first on the home page",
    icon: Home,
  },
  {
    kind: "gallery" as const,
    title: "Gallery album",
    copy: "Tamim's cinema album organized by category",
    icon: Clapperboard,
  },
  {
    kind: "memory" as const,
    title: "A memory",
    copy: "Milestone or chapter on the timeline",
    icon: BookOpen,
  },
  {
    kind: "tree" as const,
    title: "Family tree person",
    copy: "Their ornament photo on the branch in the family tree",
    icon: Sprout,
  },
  {
    kind: "relative" as const,
    title: "A relative",
    copy: "A person's card on the Relatives page",
    icon: Users,
  },
];

function PhotoFlow({
  memories,
  relatives,
  galleryCategories,
  currentMedia,
  onMediaChange,
}: {
  memories: LoaderData["memories"];
  relatives: LoaderData["relatives"];
  galleryCategories: string[];
  currentMedia: UploadedMedia[];
  onMediaChange: (media: UploadedMedia[]) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueuedMedia[]>([]);
  const [queue, setQueue] = useState<QueuedMedia[]>([]);
  const [busyUpload, setBusyUpload] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Where should it show? states
  const [kind, setKind] = useState<(typeof places)[number]["kind"]>("gallery");
  const [busyPlace, setBusyPlace] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  // Gallery-specific states
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string>(
    galleryCategories[0] || "03 - تميم وهو صغير",
  );
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [galleryPhotoTitle, setGalleryPhotoTitle] = useState("");
  const [galleryDate, setGalleryDate] = useState(getTodayIsoDate());

  // Memory-specific states
  const [memoryMode, setMemoryMode] = useState<"existing" | "new">("existing");
  const [memoryCategoryFilter, setMemoryCategoryFilter] = useState("All");
  const [targetMemoryId, setTargetMemoryId] = useState("");
  const [newMemoryTitle, setNewMemoryTitle] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState("Milestones");
  const [newMemoryDate, setNewMemoryDate] = useState(getTodayIsoDate());
  const [newMemoryStory, setNewMemoryStory] = useState("");

  // Relative-specific states
  const [relativeGroupFilter, setRelativeGroupFilter] = useState("All");
  const [targetRelativeId, setTargetRelativeId] = useState("");

  const [linkUrl, setLinkUrl] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const hasMultipleMedia = currentMedia.length > 1;
  const hasVideo = currentMedia.some((media) => media.kind === "video");
  const firstMedia = currentMedia[0];

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(
    () => () => {
      for (const item of queueRef.current) URL.revokeObjectURL(item.previewUrl);
    },
    [],
  );

  useEffect(() => {
    if (hasMultipleMedia || hasVideo) setKind("gallery");
  }, [hasMultipleMedia, hasVideo]);

  function handleFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const supported = incoming.filter(isSupportedMediaFile);
    const unsupportedCount = incoming.length - supported.length;
    const availableSlots = Math.max(0, MAX_BATCH_FILES - queue.length);
    const accepted = supported.slice(0, availableSlots);
    const items = accepted.map(makeQueuedMedia);

    if (items.length) {
      setQueue((previous) => [...previous, ...items]);
      setUploadError(
        unsupportedCount || accepted.length < supported.length
          ? "تم استبعاد ملفات غير مدعومة أو تجاوزت الحد الأقصى (30 ملفًا في المرة)."
          : null,
      );
      setPlaced(null);
      if (items.length > 1 || items.some((item) => item.kind === "video")) setKind("gallery");
    } else {
      setUploadError("اختر ملف صورة أو فيديو صالحًا أولًا.");
    }
  }

  function removeQueued(id: string) {
    setQueue((previous) => {
      const item = previous.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return previous.filter((entry) => entry.id !== id);
    });
  }

  function clearQueue() {
    setQueue((previous) => {
      for (const item of previous) URL.revokeObjectURL(item.previewUrl);
      return [];
    });
  }

  async function upload() {
    if (!queue.length || busyUpload) return;
    const batch = [...queue];
    const totalBytes = Math.max(
      1,
      batch.reduce((sum, item) => sum + item.file.size, 0),
    );
    const progressById: Record<string, number> = Object.fromEntries(
      batch.map((item) => [item.id, 0]),
    );
    const initialProgress = Object.fromEntries(batch.map((item) => [item.id, 0]));

    setBusyUpload(true);
    setUploadError(null);
    setPlaced(null);
    setFileProgress(initialProgress);
    setOverallProgress(0);

    const results = await mapWithConcurrency(batch, 2, async (item) => {
      try {
        return await uploadMediaDirect(item.file, item.name, (percent) => {
          progressById[item.id] = percent;
          setFileProgress((previous) => ({ ...previous, [item.id]: percent }));
          const uploadedWeight = batch.reduce(
            (sum, queued) => sum + (progressById[queued.id] ?? 0) * (queued.file.size / totalBytes),
            0,
          );
          setOverallProgress(uploadedWeight);
        });
      } catch {
        return null;
      }
    });

    const successful = results.filter((result): result is UploadedMedia => result !== null);
    const failedIndexes = results
      .map((result, index) => (result ? -1 : index))
      .filter((index) => index >= 0);
    for (const index of successfulIndexesFrom(results)) {
      const item = batch[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
    }
    setQueue(failedIndexes.map((index) => batch[index]!).filter(Boolean));
    setOverallProgress(100);
    setBusyUpload(false);

    if (successful.length) {
      onMediaChange(successful);
      const onlyItem = successful.length === 1 ? successful[0] : undefined;
      if (onlyItem && !galleryPhotoTitle) setGalleryPhotoTitle(onlyItem.name);
      if (onlyItem && !newMemoryTitle) setNewMemoryTitle(onlyItem.name);
      await router.invalidate();
    }

    if (failedIndexes.length) {
      setUploadError(
        `تم رفع ${successful.length} من ${batch.length}. الملفات الفاشلة موجودة لإعادة المحاولة.`,
      );
    }
  }

  function applyLink() {
    if (!linkUrl.trim()) return;
    onMediaChange([
      {
        url: linkUrl.trim(),
        thumbnailUrl: linkUrl.trim(),
        publicId: "",
        kind: "image",
        name: "Linked photo",
      },
    ]);
    setKind("gallery");
    setPlaced(null);
  }

  async function place() {
    if (!currentMedia.length || busyPlace) return;
    if (kind !== "gallery" && (hasMultipleMedia || hasVideo)) return;
    const media = firstMedia;
    if (!media) return;

    setBusyPlace(true);
    setPlaced(null);
    let ok = false;
    let label = "";

    try {
      if (kind === "hero") {
        const res = await setFamilyPhoto({ data: { kind: "hero", url: media.url } });
        ok = res.ok;
        label = "تم تحديث صورة الصفحة الرئيسية — أصبحت ظاهرة الآن!";
      } else if (kind === "gallery") {
        const effectiveCategory = isCustomCategory
          ? customCategoryInput.trim() || "03 - تميم وهو صغير"
          : selectedGalleryCategory;
        let savedCount = 0;
        const remainingMedia: UploadedMedia[] = [];
        for (const item of currentMedia) {
          const res = await setFamilyPhoto({
            data: {
              kind: "gallery",
              url: item.url,
              name: galleryPhotoTitle.trim() || item.name || "Tamim media",
              category: effectiveCategory,
              date: galleryDate.trim(),
              mediaKind: item.kind,
              thumbnailUrl: item.thumbnailUrl,
            },
          });
          if (res.ok) savedCount += 1;
          else remainingMedia.push(item);
        }
        ok = savedCount === currentMedia.length;
        label = `تمت إضافة ${savedCount} عنصر إلى ألبوم "${effectiveCategory}" — ظهرت الآن في السلايدر!`;
        if (savedCount > 0) {
          onMediaChange(remainingMedia);
          await router.invalidate();
        }
      } else if (kind === "memory") {
        if (memoryMode === "new") {
          const effectiveTitle = newMemoryTitle.trim() || media.name || "A precious moment";
          const res = await setFamilyPhoto({
            data: {
              kind: "memory",
              id: "new",
              url: media.url,
              name: effectiveTitle,
              category: newMemoryCategory,
              date: newMemoryDate.trim() || new Date().toISOString().slice(0, 10),
              story: newMemoryStory.trim(),
            },
          });
          ok = res.ok;
          label = `تم إنشاء الذاكرة "${effectiveTitle}" — ظهرت الآن على الخط الزمني!`;
          if (ok) {
            setNewMemoryTitle("");
            setNewMemoryStory("");
            onMediaChange([]);
            await router.invalidate();
          }
        } else {
          const res = await setFamilyPhoto({
            data: { kind: "memory", id: targetMemoryId, url: media.url },
          });
          ok = res.ok;
          const chosenMemory = memories.find((m) => m.id === targetMemoryId);
          label = `تم تحديث صورة الذاكرة "${chosenMemory?.title || "those memories"}".`;
        }
      } else if (kind === "tree" || kind === "relative") {
        const res = await setFamilyPhoto({
          data: { kind: "relative", id: targetRelativeId, url: media.url },
        });
        ok = res.ok;
        const chosenRelative = relatives.find((r) => r.id === targetRelativeId);
        label =
          kind === "tree"
            ? `تم تحديث صورة ${chosenRelative?.name || "this person"} في شجرة العائلة.`
            : `تم تحديث بطاقة ${chosenRelative?.name || "the relative"}.`;
      }
    } catch {
      ok = false;
    }

    if (ok && kind !== "gallery") {
      onMediaChange([]);
      await router.invalidate();
    }
    setBusyPlace(false);
    if (ok) setPlaced(label);
    else setPlaced("تعذر الحفظ — يرجى المحاولة مرة أخرى.");
  }

  // Filtered lists for Memories & Relatives
  const allMemoryCategories = [
    "All",
    ...new Set([...DEFAULT_MEMORY_CATEGORIES, ...memories.map((m) => m.category)]),
  ];
  const filteredMemories =
    memoryCategoryFilter === "All"
      ? memories
      : memories.filter((m) => m.category === memoryCategoryFilter);

  const allRelativeGroups = [
    "All",
    ...new Set(["Family", ...relatives.map((r) => r.group).filter(Boolean)]),
  ];
  const filteredRelatives =
    relativeGroupFilter === "All"
      ? relatives
      : relatives.filter((r) => r.group === relativeGroupFilter);

  const isPlaceDisabled =
    !currentMedia.length ||
    busyPlace ||
    (kind !== "gallery" && (hasMultipleMedia || hasVideo)) ||
    (kind === "gallery" && isCustomCategory && !customCategoryInput.trim()) ||
    (kind === "memory" && memoryMode === "existing" && !targetMemoryId) ||
    (kind === "memory" && memoryMode === "new" && !newMemoryTitle.trim() && !firstMedia?.name) ||
    ((kind === "relative" || kind === "tree") && !targetRelativeId);

  const actionButtonText = busyPlace
    ? "جارٍ حفظ الملفات…"
    : kind === "hero"
      ? "تعيين كصورة الصفحة الرئيسية"
      : kind === "gallery"
        ? `إضافة ${currentMedia.length} عنصر إلى الألبوم`
        : kind === "memory"
          ? memoryMode === "new"
            ? "إنشاء ذاكرة جديدة"
            : "تحديث صورة الذاكرة"
          : kind === "tree"
            ? "تعيينها في شجرة العائلة"
            : "تعيينها في بطاقة الفرد";

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft sm:p-6 2xl:p-8">
      <UploadBusyOverlay
        open={busyUpload}
        progress={overallProgress}
        title="جارٍ رفع الصور والفيديوهات"
        subtitle={
          queue.length === 1
            ? `جارٍ رفع “${queue[0]?.name || "الملف"}” — استنى لحد ما يخلص.`
            : `جارٍ رفع ${queue.length} ملفات — التطبيق مقفل مؤقتًا حتى انتهاء العملية.`
        }
      />

      <div className="flex items-center gap-3">
        <StepBadge n={1} />
        <div>
          <h2 className="font-display text-xl leading-tight 2xl:text-2xl">
            اختر الصور والفيديوهات
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground 2xl:text-sm">
            اختر ملفًا واحدًا أو عدة ملفات معًا، وارفعهم دفعة واحدة مع شريط تقدم حقيقي.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.mp4,.mov,.m4v,.webm"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) handleFiles(event.target.files);
          event.target.value = "";
        }}
        aria-label="Choose one or more photos or videos"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
        className="mt-5 flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/35 bg-secondary/45 px-5 py-7 text-center transition hover:border-primary/70 hover:bg-secondary/65 active:scale-[.995] 2xl:min-h-52"
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary 2xl:size-16">
          <CloudUpload className="size-7 2xl:size-8" />
        </span>
        <span>
          <b className="block font-display text-xl 2xl:text-2xl">اضغط أو اسحب الملفات هنا</b>
          <span className="mt-1 block text-sm text-muted-foreground 2xl:text-base">
            صور وفيديوهات معًا — حد أقصى 30 ملفًا في الدفعة الواحدة
          </span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-semibold text-primary shadow-soft 2xl:text-sm">
          <ImagePlus className="size-4" /> اختيار صور
          <FileVideo className="size-4" /> وفيديوهات
        </span>
      </button>

      {queue.length > 0 && (
        <div className="mt-5 rounded-xl border border-border bg-secondary/35 p-3.5 2xl:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">الملفات المختارة</h3>
              <p className="text-xs text-muted-foreground">{queue.length} ملفات جاهزة للرفع</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearQueue}
              disabled={busyUpload}
            >
              <X className="size-4" /> مسح الاختيار
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {queue.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-card p-2 shadow-sm"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                  {item.kind === "image" ? (
                    <img src={item.previewUrl} alt={item.name} className="size-full object-cover" />
                  ) : (
                    <>
                      <video
                        src={item.previewUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="size-full object-cover"
                      />
                      <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/25 text-white">
                        <Video className="size-8" />
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeQueued(item.id)}
                    disabled={busyUpload}
                    aria-label={`إزالة ${item.name} من الاختيار`}
                    className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-100 transition hover:bg-destructive disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                  {busyUpload && (
                    <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-black/70 px-2 py-1.5 text-center text-[0.68rem] font-semibold text-white">
                      {fileProgress[item.id] || 0}%
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-semibold" title={item.name}>
                  {item.name}
                </p>
                <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                  {item.kind === "video" ? "فيديو" : "صورة"} · {formatFileSize(item.file.size)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          onClick={() => void upload()}
          disabled={!queue.length || busyUpload}
          className="h-12 w-full text-base sm:w-auto sm:px-7 2xl:h-14"
        >
          <Upload className="size-5" />
          {busyUpload
            ? "جارٍ الرفع…"
            : `رفع ${queue.length || ""} ${queue.length === 1 ? "ملف" : "ملفات"}`}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          يمكنك اختيار فيديوهات وصور معًا. التطبيق يتوقف تلقائيًا أثناء الرفع ولا يسمح بأي تغيير
          آخر.
        </p>
      </div>
      {uploadError && <p className="mt-3 text-sm font-medium text-destructive">{uploadError}</p>}

      {currentMedia.length > 0 && (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check className="size-4 shrink-0" />
          اكتمل رفع {currentMedia.length} {currentMedia.length === 1 ? "ملف" : "ملفات"}. اختر مكان
          ظهورها بالأسفل.
        </p>
      )}

      <div className="mt-7 flex items-center gap-3">
        <StepBadge n={2} />
        <div>
          <h2 className="font-display text-xl leading-tight">Where should it show?</h2>
          <p className="text-xs text-muted-foreground">
            Select the destination and category. You can change it anytime.
          </p>
        </div>
      </div>

      {(hasMultipleMedia || hasVideo) && (
        <p className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
          الملفات المتعددة أو الفيديو متاحة في ألبوم Gallery فقط. الصور المفردة ما زالت متاحة
          للوجهات الأخرى.
        </p>
      )}

      {/* Destination Grid: all the pages a photo can live on */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
        {places.map(({ kind: k, title, copy, icon: Icon }) => {
          const unavailable = k !== "gallery" && (hasMultipleMedia || hasVideo);
          return (
            <button
              key={k}
              type="button"
              disabled={unavailable}
              onClick={() => {
                if (unavailable) return;
                setKind(k);
                setPlaced(null);
              }}
              className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45 ${
                kind === k
                  ? "border-primary bg-secondary ring-1 ring-primary shadow-sm"
                  : "border-border bg-background/50 hover:bg-secondary/40"
              }`}
            >
              <span
                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                  kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm">{title}</b>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{copy}</span>
              </span>
              {kind === k && <Check className="mt-1 size-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      {/* Destination Context & Category Controls */}
      <div className="mt-4 rounded-lg bg-secondary/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {firstMedia ? (
            <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-border bg-black shadow-sm sm:size-28 2xl:size-32">
              {firstMedia.kind === "video" ? (
                <video
                  src={firstMedia.thumbnailUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                />
              ) : (
                <img src={firstMedia.url} alt="" className="size-full object-cover" />
              )}
              {firstMedia.kind === "video" && (
                <span className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                  <Video className="size-7" />
                </span>
              )}
              {hasMultipleMedia && (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/75 px-2 py-1 text-[0.65rem] font-semibold text-white">
                  +{currentMedia.length - 1}
                </span>
              )}
            </div>
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-card text-center text-[0.68rem] text-muted-foreground sm:size-28 2xl:size-32">
              لا يوجد ملف
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-4">
            {/* FRONT PAGE (HERO) */}
            {kind === "hero" && (
              <div className="rounded-md border border-border/60 bg-background/80 p-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Home className="size-4 text-primary" />
                  Front page cover photo
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  The front page uses one photo at a time. Placing this photo will immediately
                  update Tamim's welcome header for everyone visiting the site.
                </p>
              </div>
            )}

            {/* GALLERY DESTINATION */}
            {kind === "gallery" && (
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold">
                      <Tag className="size-3.5 text-primary" />
                      Choose a gallery category:
                    </label>
                    <span className="text-[0.7rem] text-muted-foreground">
                      Organized albums for Tamim's cinema
                    </span>
                  </div>

                  {/* Category Chips */}
                  <div className="no-scrollbar mt-2 flex flex-wrap gap-1.5">
                    {galleryCategories.map((cat) => {
                      const isSelected = !isCustomCategory && selectedGalleryCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedGalleryCategory(cat);
                            setIsCustomCategory(false);
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "border border-border bg-background text-foreground hover:bg-secondary"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(true)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                        isCustomCategory
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-dashed border-primary/60 bg-background text-primary hover:bg-primary/10"
                      }`}
                    >
                      <Plus className="size-3" />+ Custom category
                    </button>
                  </div>

                  {isCustomCategory && (
                    <div className="mt-2.5">
                      <Input
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="Type new category name (e.g. 12 - أول يوم حضانة)"
                        className="h-10 text-sm"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold" htmlFor="gallery-caption">
                      عنوان موحد للسلايدر{" "}
                      <span className="font-normal text-muted-foreground">(اختياري)</span>
                    </label>
                    <Input
                      id="gallery-caption"
                      value={galleryPhotoTitle}
                      onChange={(e) => setGalleryPhotoTitle(e.target.value)}
                      placeholder="e.g. تميم بيضحك مع بابا"
                      className="mt-1 h-10 text-sm"
                    />
                    {hasMultipleMedia && (
                      <p className="mt-1 text-[0.68rem] leading-4 text-muted-foreground">
                        لو تركته فارغًا، سيحتفظ كل عنصر باسم ملفه الأصلي.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold" htmlFor="gallery-date">
                      Date{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional, e.g. 2024-05-10)
                      </span>
                    </label>
                    <Input
                      id="gallery-date"
                      value={galleryDate}
                      onChange={(e) => setGalleryDate(e.target.value)}
                      placeholder="YYYY-MM-DD or readable date"
                      className="mt-1 h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MEMORY DESTINATION */}
            {kind === "memory" && (
              <div className="space-y-3.5">
                <div className="flex gap-2 border-b border-border/60 pb-2">
                  <button
                    type="button"
                    onClick={() => setMemoryMode("existing")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      memoryMode === "existing"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Update existing memory photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemoryMode("new")}
                    className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      memoryMode === "new"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Plus className="size-3" />
                    Create new memory chapter
                  </button>
                </div>

                {memoryMode === "existing" ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Filter by category:
                      </span>
                      {allMemoryCategories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setMemoryCategoryFilter(c)}
                          className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium transition ${
                            memoryCategoryFilter === c
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2.5">
                      <label className="text-xs font-semibold" htmlFor="place-memory-select">
                        Which memory?
                      </label>
                      <select
                        id="place-memory-select"
                        value={targetMemoryId}
                        onChange={(e) => setTargetMemoryId(e.target.value)}
                        className={`mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm ${
                          targetMemoryId ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <option value="">Choose a memory…</option>
                        {filteredMemories.map((item) => (
                          <option key={item.id} value={item.id} className="text-foreground">
                            {item.title} ({item.category}
                            {item.date ? ` · ${item.date}` : ""})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold" htmlFor="new-mem-title">
                          Memory Title *
                        </label>
                        <Input
                          id="new-mem-title"
                          value={newMemoryTitle}
                          onChange={(e) => setNewMemoryTitle(e.target.value)}
                          placeholder="e.g. First time crawling"
                          className="mt-1 h-10 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold" htmlFor="new-mem-date">
                          Date
                        </label>
                        <Input
                          id="new-mem-date"
                          value={newMemoryDate}
                          onChange={(e) => setNewMemoryDate(e.target.value)}
                          placeholder="e.g. March 15, 2024"
                          className="mt-1 h-10 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold">Memory Category</label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {DEFAULT_MEMORY_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewMemoryCategory(cat)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              newMemoryCategory === cat
                                ? "bg-primary text-primary-foreground"
                                : "border border-border bg-background text-foreground"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold" htmlFor="new-mem-story">
                        Story or little note{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <Textarea
                        id="new-mem-story"
                        value={newMemoryStory}
                        onChange={(e) => setNewMemoryStory(e.target.value)}
                        placeholder="What made this moment special? You can write in Arabic or English."
                        className="mt-1 min-h-20 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RELATIVE / FAMILY-TREE DESTINATION */}
            {(kind === "relative" || kind === "tree") && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {kind === "tree" ? (
                    <>
                      <Sprout className="size-4 text-primary" />
                      Family tree ornament
                    </>
                  ) : (
                    <>
                      <Users className="size-4 text-primary" />
                      Relatives page card
                    </>
                  )}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {kind === "tree"
                    ? "This photo becomes the person's ornament in the family tree — the same photo also shows on their card in the Relatives page."
                    : "This photo becomes the person's card on the Relatives page — it also updates their ornament in the family tree."}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Filter group:</span>
                  {allRelativeGroups.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setRelativeGroupFilter(g)}
                      className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium transition ${
                        relativeGroupFilter === g
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-semibold" htmlFor="place-relative-select">
                    {kind === "tree" ? "Which family member?" : "Which relative?"}
                  </label>
                  <select
                    id="place-relative-select"
                    value={targetRelativeId}
                    onChange={(e) => setTargetRelativeId(e.target.value)}
                    className={`mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm ${
                      targetRelativeId ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <option value="">Choose a family member…</option>
                    {filteredRelatives.map((item) => (
                      <option key={item.id} value={item.id} className="text-foreground">
                        {item.name} ({item.relationship || item.group})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          type="button"
          onClick={place}
          disabled={isPlaceDisabled}
          className="mt-4 h-12 w-full font-medium"
        >
          {actionButtonText}
        </Button>

        {placed && (
          <p
            className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              placed.startsWith("تعذر") || placed.startsWith("Couldn't")
                ? "bg-destructive/10 text-destructive"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            <Check className="size-4 shrink-0" />
            {placed}
          </p>
        )}
      </div>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-4">
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
          <Link2 className="size-3.5" />
          Skip uploading — paste a photo link instead
          <ChevronDown
            className={`size-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setPlaced(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && applyLink()}
              placeholder="https://…"
              aria-label="Photo link"
              className="h-11"
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyLink}
              disabled={!linkUrl.trim()}
              className="h-11 shrink-0"
            >
              Use it
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Most people never need this. Useful for reusing an image already on the site.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function PhotoLibrary({
  photos,
  onPick,
  onDeleted,
}: {
  photos: LoaderData["photos"];
  onPick: (media: UploadedMedia) => void;
  onDeleted: (url: string) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LoaderData["photos"][number] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPhotos = normalizedQuery
    ? photos.filter((photo) =>
        `${photo.publicId} ${photo.url}`.toLowerCase().includes(normalizedQuery),
      )
    : photos;

  async function remove() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const { ok } = await deleteFamilyPhoto({
      data: {
        publicId: deleteTarget.publicId,
        kind: deleteTarget.kind,
        url: deleteTarget.url,
      },
    });
    if (!ok) {
      setDeleteError("تعذر حذف الملف. تأكد من الاتصال ثم حاول مرة أخرى.");
      setDeleting(false);
      return;
    }
    onDeleted(deleteTarget.url);
    setDeleteTarget(null);
    setDeleting(false);
    await router.invalidate();
  }

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-5 shadow-soft 2xl:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl 2xl:text-2xl">مكتبة الصور والفيديوهات</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground 2xl:text-sm">
              اضغط على أي ملف لاختياره وإضافته إلى ألبوم أو صفحة أخرى.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            {filteredPhotos.length} / {photos.length}
          </span>
        </div>

        {photos.length > 0 && (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث في المكتبة…"
              className="h-10 pl-9 text-sm"
              aria-label="Search uploaded media"
            />
          </div>
        )}

        {filteredPhotos.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:max-h-[68dvh] 2xl:grid-cols-3 2xl:overflow-y-auto 2xl:pr-1">
            {filteredPhotos.map((p) => {
              const nameFromUrl = p.url.split("/").pop()?.split("?")[0] || "Uploaded media";
              const previewUrl =
                p.kind === "video"
                  ? p.url.replace("/video/upload/", "/video/upload/so_0,f_jpg,q_auto,w_600/")
                  : p.url;
              return (
                <div key={p.publicId} className="group relative">
                  <button
                    type="button"
                    onClick={() =>
                      onPick({
                        url: p.url,
                        thumbnailUrl:
                          p.kind === "video" ? cloudinaryVideoThumbnailUrl(p.url) : p.url,
                        publicId: p.publicId,
                        kind: p.kind,
                        name: nameFromUrl.replace(/\.[^.]+$/, ""),
                      })
                    }
                    className="block w-full cursor-pointer"
                    aria-label={`استخدام ${p.kind === "video" ? "الفيديو" : "الصورة"}`}
                  >
                    <span className="relative block overflow-hidden rounded-lg bg-muted">
                      <img
                        src={previewUrl}
                        alt=""
                        loading="lazy"
                        width={300}
                        height={300}
                        className="aspect-square w-full object-cover transition group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-primary"
                      />
                      {p.kind === "video" && (
                        <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/25 text-white">
                          <span className="grid size-10 place-items-center rounded-full bg-black/55">
                            <Play className="ml-0.5 size-5 fill-current" />
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="mt-2 flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
                      {p.kind === "video" ? (
                        <Video className="size-3.5" />
                      ) : (
                        <Images className="size-3.5" />
                      )}
                      <span className="truncate">{p.kind === "video" ? "فيديو" : "صورة"}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(p);
                      setDeleteError(null);
                    }}
                    aria-label="حذف الملف نهائيًا"
                    className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full bg-background/90 text-destructive shadow-soft transition hover:bg-destructive hover:text-white active:scale-90"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center">
            <Images className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 font-display text-xl">
              {photos.length ? "لا توجد نتائج مطابقة" : "المكتبة فارغة حاليًا"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {photos.length
                ? "جرّب اسمًا آخر أو امسح البحث."
                : "الملفات التي ترفعها من أعلى ستظهر هنا."}
            </p>
          </div>
        )}
      </section>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!deleting && !open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">
              حذف الملف نهائيًا؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-6">
              سيتم حذف {deleteTarget?.kind === "video" ? "الفيديو" : "الصورة"} من مكتبة Cloudinary
              نهائيًا. سيُحذف تلقائيًا من الألبوم أيضًا، وأي ظهور قديم له في الصفحات سيتأثر. لا يمكن
              التراجع عن هذه الخطوة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm font-medium text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={(event) => {
                  event.preventDefault();
                  void remove();
                }}
              >
                {deleting ? "جارٍ الحذف…" : "نعم، احذف نهائيًا"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditDetails({
  child,
  memories,
  relatives,
  galleryItems,
  galleryCategories,
}: {
  child: LoaderData["child"];
  memories: LoaderData["memories"];
  relatives: LoaderData["relatives"];
  galleryItems: LoaderData["galleryItems"];
  galleryCategories: string[];
}) {
  const [childForm, setChildForm] = useState({
    name: child.name,
    birthdate: child.birthdate,
    welcome: child.welcome,
  });
  const [childStatus, setChildStatus] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function saveChild() {
    setChildStatus(null);
    const { ok } = await setFamilyDetails({ data: childForm });
    setChildStatus(ok ? "Tamim's details are saved." : "Could not save — try again.");
  }

  async function saveMemory(id: string, patch: Record<string, string>) {
    const { ok } = await updateMemoryEntry({ data: { id, patch } });
    setEdits((prev) => ({ ...prev, [`m-${id}`]: ok ? "Saved ✓" : "Save failed" }));
    setTimeout(() => setEdits((prev) => ({ ...prev, [`m-${id}`]: "" })), 3000);
  }

  async function saveRelative(id: string, patch: Record<string, string>) {
    const { ok } = await updateRelativeEntry({ data: { id, patch } });
    setEdits((prev) => ({ ...prev, [`r-${id}`]: ok ? "Saved ✓" : "Save failed" }));
    setTimeout(() => setEdits((prev) => ({ ...prev, [`r-${id}`]: "" })), 3000);
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <StepBadge n={3} />
        <div>
          <h2 className="font-display text-xl leading-tight">Fix the words & organize</h2>
          <p className="text-xs text-muted-foreground">
            Captions, names, stories, and moving gallery items between categories.
          </p>
        </div>
      </div>
      <Tabs defaultValue="child" className="mt-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="child">Tamim's page</TabsTrigger>
          <TabsTrigger value="memories">Memory captions</TabsTrigger>
          <TabsTrigger value="relatives">Relative cards</TabsTrigger>
          <TabsTrigger value="gallery">
            Gallery category organizer ({galleryItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="child" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Name
              <Input
                value={childForm.name}
                onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
                className="mt-1 h-11"
              />
            </label>
            <label className="text-xs font-semibold">
              Birthdate <span className="font-normal text-muted-foreground">(YYYY-MM-DD)</span>
              <Input
                value={childForm.birthdate}
                onChange={(e) => setChildForm({ ...childForm, birthdate: e.target.value })}
                className="mt-1 h-11"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold">
            Welcome message
            <Textarea
              value={childForm.welcome}
              onChange={(e) => setChildForm({ ...childForm, welcome: e.target.value })}
              className="mt-1"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={saveChild} className="h-11">
              <Save className="size-4" />
              Save details
            </Button>
            {childStatus && (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {childStatus}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="memories" className="mt-4">
          <MemForm items={memories} statuses={edits} onSave={saveMemory} />
        </TabsContent>

        <TabsContent value="relatives" className="mt-4">
          <RelForm items={relatives} statuses={edits} onSave={saveRelative} />
        </TabsContent>

        <TabsContent value="gallery" className="mt-4">
          <GalleryOrganizer items={galleryItems} categories={galleryCategories} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function GalleryOrganizer({
  items,
  categories,
}: {
  items: LoaderData["galleryItems"];
  categories: string[];
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<Record<string, string>>({});

  const filtered = items.filter((item) => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = !search || item.sourceName.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  async function handleMove(id: string, newCategory: string) {
    if (!newCategory) return;
    setMovingId(id);
    const { ok } = await moveGalleryItemCategory({ data: { id, category: newCategory } });
    setMovingId(null);
    if (ok) {
      setStatusMsg((prev) => ({ ...prev, [id]: `Moved to "${newCategory}" ✓` }));
      setTimeout(() => setStatusMsg((prev) => ({ ...prev, [id]: "" })), 3500);
      await router.invalidate();
    } else {
      setStatusMsg((prev) => ({ ...prev, [id]: "Move failed" }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search photo or video by name…"
            className="h-10 text-sm"
          />
        </div>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedCategory(c)}
            className={`min-h-8 shrink-0 rounded-full px-3 text-xs font-medium transition ${
              selectedCategory === c
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border/80 bg-background/80 p-3 shadow-sm transition hover:border-primary/50"
          >
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-card">
              <img src={item.thumb} alt="" className="size-full object-cover" />
              {item.kind === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <Play className="size-4 fill-white text-white" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="truncate text-xs font-semibold" title={item.sourceName}>
                {item.sourceName.replace(/\.[^.]+$/, "")}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-[0.7rem] text-muted-foreground">Move to:</span>
                <select
                  value={item.category}
                  disabled={movingId === item.id}
                  onChange={(e) => handleMove(item.id, e.target.value)}
                  className="h-7 w-full max-w-[170px] truncate rounded border border-input bg-card px-2 text-[0.72rem] font-medium text-foreground transition focus:ring-1 focus:ring-primary"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {statusMsg[item.id] && (
                <p className="text-[0.72rem] font-medium text-emerald-700 dark:text-emerald-300">
                  {statusMsg[item.id]}
                </p>
              )}
            </div>
            {item.canDelete && (
              <DeleteGalleryItemButton
                id={item.id}
                itemName={item.sourceName.replace(/\.[^.]+$/, "")}
                compact
                onDone={() => router.invalidate()}
              />
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No items found in this category.
        </p>
      )}
    </div>
  );
}

function MemForm({
  items,
  statuses,
  onSave,
}: {
  items: LoaderData["memories"];
  statuses: Record<string, string>;
  onSave: (id: string, patch: Record<string, string>) => void;
}) {
  const [title, setTitle] = useState<Record<string, string>>({});
  const [date, setDate] = useState<Record<string, string>>({});
  const [story, setStory] = useState<Record<string, string>>({});
  return (
    <div className="space-y-5">
      {items.map((m) => (
        <fieldset key={m.id} className="rounded-md border border-border/70 bg-background/60 p-4">
          <legend className="px-2 font-display text-sm">{m.title}</legend>
          <div className="grid gap-3">
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={m.title}
              onChange={(e) => setTitle((p) => ({ ...p, [m.id]: e.target.value }))}
              aria-label="Title"
              placeholder="Title"
            />
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={m.date}
              onChange={(e) => setDate((p) => ({ ...p, [m.id]: e.target.value }))}
              aria-label="Date"
              placeholder="Date"
            />
            <textarea
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={m.story}
              onChange={(e) => setStory((p) => ({ ...p, [m.id]: e.target.value }))}
              aria-label="Story"
              placeholder="Story"
            />
            <div className="flex items-center justify-end gap-3">
              {statuses[`m-${m.id}`] && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {statuses[`m-${m.id}`]}
                </span>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onSave(m.id, {
                    title: title[m.id] ?? m.title,
                    date: date[m.id] ?? m.date,
                    story: story[m.id] ?? m.story,
                  })
                }
              >
                <Save className="size-4" />
                Save
              </Button>
            </div>
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function RelForm({
  items,
  statuses,
  onSave,
}: {
  items: LoaderData["relatives"];
  statuses: Record<string, string>;
  onSave: (id: string, patch: Record<string, string>) => void;
}) {
  const [name, setName] = useState<Record<string, string>>({});
  const [relationship, setRelationship] = useState<Record<string, string>>({});
  const [bio, setBio] = useState<Record<string, string>>({});
  const [fact, setFact] = useState<Record<string, string>>({});
  return (
    <div className="space-y-5">
      {items.map((r) => (
        <fieldset key={r.id} className="rounded-md border border-border/70 bg-background/60 p-4">
          <legend className="px-2 font-display text-sm">{r.name}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={r.name}
              onChange={(e) => setName((p) => ({ ...p, [r.id]: e.target.value }))}
              aria-label="Name"
              placeholder="Name"
            />
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={r.relationship}
              onChange={(e) => setRelationship((p) => ({ ...p, [r.id]: e.target.value }))}
              aria-label="Relationship"
              placeholder="Relationship"
            />
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={r.fact}
              onChange={(e) => setFact((p) => ({ ...p, [r.id]: e.target.value }))}
              aria-label="Fun fact"
              placeholder="Fun fact"
            />
            <textarea
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
              defaultValue={r.bio}
              onChange={(e) => setBio((p) => ({ ...p, [r.id]: e.target.value }))}
              aria-label="Bio"
              placeholder="Bio"
            />
            <div className="flex items-center justify-end gap-3 sm:col-span-2">
              {statuses[`r-${r.id}`] && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {statuses[`r-${r.id}`]}
                </span>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onSave(r.id, {
                    name: name[r.id] ?? r.name,
                    relationship: relationship[r.id] ?? r.relationship,
                    fact: fact[r.id] ?? r.fact,
                    bio: bio[r.id] ?? r.bio,
                  })
                }
              >
                <Save className="size-4" />
                Save
              </Button>
            </div>
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function ManagePage() {
  const data = Route.useLoaderData();
  const [currentMedia, setCurrentMedia] = useState<UploadedMedia[]>([]);
  return (
    <WorldShell>
      <PageIntro
        eyebrow="Mom & Dad's corner"
        title="إدارة الألبوم"
        text="ارفع صورًا وفيديوهات متعددة دفعة واحدة، اختار الألبوم المناسب، وراقب نسبة الرفع حتى النهاية. كل تعديل يظهر فورًا."
      />
      <div
        dir="rtl"
        className="grid gap-5 px-5 pb-12 sm:px-8 2xl:grid-cols-[minmax(0,1.45fr)_minmax(24rem,0.75fr)] 2xl:items-start 2xl:px-12 2xl:pb-16"
      >
        <div className="min-w-0 space-y-5">
          <PhotoFlow
            memories={data.memories}
            relatives={data.relatives}
            galleryCategories={data.galleryCategories}
            currentMedia={currentMedia}
            onMediaChange={setCurrentMedia}
          />
          <EditDetails
            child={data.child}
            memories={data.memories}
            relatives={data.relatives}
            galleryItems={data.galleryItems}
            galleryCategories={data.galleryCategories}
          />
        </div>
        <aside className="min-w-0">
          <PhotoLibrary
            photos={data.photos}
            onPick={(media) => setCurrentMedia([media])}
            onDeleted={(url) =>
              setCurrentMedia((current) => current.filter((item) => item.url !== url))
            }
          />
        </aside>
      </div>
    </WorldShell>
  );
}
