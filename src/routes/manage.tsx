import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  ChevronDown,
  CloudUpload,
  Home,
  Images,
  Link2,
  Save,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteFamilyPhoto,
  getHomeData,
  getMemoriesData,
  getRelativesData,
  listFamilyPhotos,
  setFamilyDetails,
  setFamilyPhoto,
  updateMemoryEntry,
  updateRelativeEntry,
} from "@/lib/gate.functions";
import { uploadPhotoDirect } from "@/lib/photo-upload";

async function loadManage() {
  const [home, memories, relatives] = await Promise.all([
    getHomeData(),
    getMemoriesData(),
    getRelativesData(),
  ]);
  const photos = await listFamilyPhotos();
  return {
    child: home.child,
    memories: memories.memories,
    relatives: relatives.relatives,
    photos: photos.photos,
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

function resizeToDataUrl(file: File, max = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file doesn't look like an image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
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
    copy: "The big photo everyone sees first",
    icon: Home,
  },
  {
    kind: "memory" as const,
    title: "A memory",
    copy: "One of the little chapters on the timeline",
    icon: BookOpen,
  },
  {
    kind: "relative" as const,
    title: "A relative",
    copy: "A person's card on the family pages",
    icon: Users,
  },
];

function PhotoFlow({
  memories,
  relatives,
  currentUrl,
  onPhotoReady,
}: {
  memories: LoaderData["memories"];
  relatives: LoaderData["relatives"];
  currentUrl: string | null;
  onPhotoReady: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busyUpload, setBusyUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [kind, setKind] = useState<(typeof places)[number]["kind"]>("hero");
  const [targetId, setTargetId] = useState("");
  const [busyPlace, setBusyPlace] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  async function handleFile(f: File) {
    try {
      const dataUrl = await resizeToDataUrl(f);
      setFile(f);
      setPreview(dataUrl);
      setName(f.name.replace(/\.[^.]+$/, ""));
      setUploadError(null);
      setPlaced(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not read the file");
    }
  }

  async function upload() {
    if (!preview) return;
    setBusyUpload(true);
    setUploadError(null);
    setPlaced(null);
    const result = file ? await uploadPhotoDirect(file, name) : null;
    setBusyUpload(false);
    if (!result) {
      setUploadError("The photo didn't upload — please try again in a moment.");
      return;
    }
    onPhotoReady(result);
    setFile(null);
    setPreview(null);
    setName("");
  }

  function applyLink() {
    if (!linkUrl.trim()) return;
    onPhotoReady(linkUrl.trim());
    setPlaced(null);
  }

  async function place() {
    if (!currentUrl) return;
    setBusyPlace(true);
    setPlaced(null);
    const id = kind === "hero" ? undefined : targetId;
    const { ok } = await setFamilyPhoto({ data: { kind, id, url: currentUrl } });
    setBusyPlace(false);
    if (ok) {
      const label =
        kind === "hero"
          ? "Front page updated — it's live now."
          : kind === "memory"
            ? "That memory got its new photo — it's live now."
            : "That relative's card got its new photo — it's live now.";
      setPlaced(label);
      setTargetId("");
    } else {
      setPlaced("Couldn't save — try again in a moment.");
    }
  }

  const items = kind === "memory" ? memories : relatives;
  const itemsLabel = kind === "memory" ? "Which memory?" : "Which relative?";

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-center gap-3">
        <StepBadge n={1} />
        <div>
          <h2 className="font-display text-xl leading-tight">Add the photo</h2>
          <p className="text-xs text-muted-foreground">
            Take one now or choose one from your phone. It's saved to your album automatically.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          aria-label="Choose a photo"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex size-40 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary/50 text-xs text-muted-foreground transition active:scale-[.98]"
        >
          {preview ? (
            <img src={preview} alt="Photo preview" className="h-full w-full object-cover" />
          ) : (
            <>
              <CloudUpload className="size-7 text-primary" />
              <span className="px-2 text-center font-medium">
                Tap to choose
                <br />a photo
              </span>
            </>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <label className="text-xs font-semibold" htmlFor="photo-name">
            Give it a little name{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="photo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tamim at the beach"
            className="mt-1.5 h-11"
          />
          <Button
            type="button"
            onClick={upload}
            disabled={!preview || busyUpload}
            className="mt-3 h-12 w-full sm:w-auto sm:px-6"
          >
            <Upload className="size-4" />
            {busyUpload ? "Saving…" : "Add to our album"}
          </Button>
          {preview && !busyUpload && (
            <p className="mt-2 text-xs text-muted-foreground">
              Not the right one? Tap the box again to pick another.
            </p>
          )}
          {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
        </div>
      </div>

      {currentUrl && (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check className="size-4 shrink-0" />
          Got it — your new photo is in the album. Now choose where it should show.
        </p>
      )}

      <div className="mt-7 flex items-center gap-3">
        <StepBadge n={2} />
        <div>
          <h2 className="font-display text-xl leading-tight">Where should it show?</h2>
          <p className="text-xs text-muted-foreground">
            You can change it as many times as you like.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {places.map(({ kind: k, title, copy, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition active:scale-[.99] ${
              kind === k
                ? "border-primary bg-secondary ring-1 ring-primary"
                : "border-border bg-background/50"
            }`}
          >
            <span
              className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
              }`}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <b className="block text-sm">{title}</b>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{copy}</span>
            </span>
            {kind === k && <Check className="ml-auto mt-1 size-4 shrink-0 text-primary" />}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-secondary/60 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt=""
              width={96}
              height={96}
              className="size-16 rounded-md border border-border object-cover"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-md border border-dashed border-border bg-card text-[0.65rem] text-muted-foreground">
              no photo yet
            </span>
          )}
          <div className="min-w-0 flex-1">
            {kind === "memory" || kind === "relative" ? (
              <>
                <label className="text-xs font-semibold" htmlFor="place-item">
                  {itemsLabel}
                </label>
                <select
                  id="place-item"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className={`mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm ${targetId ? "text-foreground" : "text-muted-foreground"}`}
                >
                  <option value="">Choose one…</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id} className="text-foreground">
                      {"title" in item ? item.title : item.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                The front page uses one photo at a time — your new one will simply replace it.
              </div>
            )}
          </div>
        </div>
        <Button
          type="button"
          onClick={place}
          disabled={
            !currentUrl || busyPlace || ((kind === "memory" || kind === "relative") && !targetId)
          }
          className="mt-4 h-12 w-full"
        >
          {busyPlace
            ? "Placing…"
            : `Place this photo on the ${kind === "hero" ? "front page" : kind === "memory" ? "memory" : "relative's card"}`}
        </Button>
        {placed && (
          <p
            className={`mt-3 flex items-center gap-2 text-sm font-medium ${
              placed.startsWith("Couldn")
                ? "text-destructive"
                : "text-emerald-700 dark:text-emerald-300"
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
}: {
  photos: LoaderData["photos"];
  onPick: (url: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  async function remove(publicId: string) {
    setBusyId(publicId);
    const { ok } = await deleteFamilyPhoto({ data: { publicId } });
    setBusyId(null);
    if (!ok) window.alert("Could not delete that photo — try again in a moment.");
  }
  if (!photos.length)
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center">
        <Images className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-3 font-display text-xl">Your album is empty for now</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Photos you add above will collect here, ready to reuse.
        </p>
      </section>
    );
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Your photo album</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap a photo to reuse it in "Add the photo" step 2 above.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((p) => (
          <div key={p.publicId} className="group relative">
            <button
              type="button"
              onClick={() => onPick(p.url)}
              className="block w-full cursor-pointer"
              aria-label="Reuse this photo"
            >
              <img
                src={p.url}
                alt=""
                loading="lazy"
                width={300}
                height={300}
                className="aspect-square w-full rounded-md object-cover transition group-hover:ring-2 group-hover:ring-primary"
              />
            </button>
            <button
              type="button"
              onClick={() => remove(p.publicId)}
              disabled={busyId === p.publicId}
              aria-label="Delete photo"
              className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-background/90 text-destructive shadow-soft transition active:scale-90 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditDetails({
  child,
  memories,
  relatives,
}: {
  child: LoaderData["child"];
  memories: LoaderData["memories"];
  relatives: LoaderData["relatives"];
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
          <h2 className="font-display text-xl leading-tight">Fix the words</h2>
          <p className="text-xs text-muted-foreground">
            Captions, names and little stories behind the photos.
          </p>
        </div>
      </div>
      <Tabs defaultValue="child" className="mt-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="child">Tamim's page</TabsTrigger>
          <TabsTrigger value="memories">Memory captions</TabsTrigger>
          <TabsTrigger value="relatives">Relative cards</TabsTrigger>
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
      </Tabs>
    </section>
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
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  return (
    <WorldShell>
      <PageIntro
        eyebrow="Mom & Dad's corner"
        title="Keep the album fresh"
        text="Add new photos, place them on the pages, and fix any caption in two simple steps. Everything goes live on the site right away."
      />
      <div className="space-y-5 px-5 pb-12 sm:px-8">
        <PhotoFlow
          memories={data.memories}
          relatives={data.relatives}
          currentUrl={currentUrl}
          onPhotoReady={setCurrentUrl}
        />
        <PhotoLibrary photos={data.photos} onPick={setCurrentUrl} />
        <EditDetails child={data.child} memories={data.memories} relatives={data.relatives} />
      </div>
    </WorldShell>
  );
}
