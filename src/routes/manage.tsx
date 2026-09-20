import { createFileRoute } from "@tanstack/react-router";
import { Camera, Check, CloudUpload, Images, Save, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  uploadFamilyPhoto,
} from "@/lib/gate.functions";

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
    meta: [{ title: "Manage photos — Tamim's World" }, { name: "robots", content: "noindex" }],
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

function UploadWidget({
  onUploaded,
  savedTick,
}: {
  onUploaded: (url: string) => void;
  savedTick: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    try {
      const dataUrl = await resizeToDataUrl(file);
      setPreview(dataUrl);
      setName(file.name.replace(/\.[^.]+$/, ""));
      setStatus(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file");
    }
  }

  async function upload() {
    if (!preview) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    const result = await uploadFamilyPhoto({ data: { source: preview, name } });
    setBusy(false);
    if (!result) {
      setError("Upload failed — check the Cloudinary setup (env vars).");
      return;
    }
    setStatus("Photo uploaded ✓ — now choose where to use it below.");
    onUploaded(result.url);
  }

  return (
    <div key={savedTick} className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Camera className="size-5 text-primary" />
        <h2 className="font-display text-xl">Upload a new photo</h2>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Photos are stored in Cloudinary and can instantly replace any placeholder.
      </p>
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
      <div className="mt-5 flex gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex size-36 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary/50 text-xs text-muted-foreground transition active:scale-[.98]"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <>
              <CloudUpload className="size-6" />
              Choose photo
            </>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <label className="text-xs font-semibold" htmlFor="photo-name">
            Photo name
          </label>
          <Input
            id="photo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tamim at the beach"
            className="mt-1.5 h-10"
          />
          <Button
            type="button"
            onClick={upload}
            disabled={!preview || busy}
            className="mt-3 h-11 w-full"
          >
            <Upload className="size-4" />
            {busy ? "Uploading…" : "Upload to Cloudinary"}
          </Button>
        </div>
      </div>
      {status && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
          <Check className="size-3.5" />
          {status}
        </p>
      )}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function UsePhotoSection({
  url,
  memories,
  relatives,
}: {
  url: string | null;
  memories: LoaderData["memories"];
  relatives: LoaderData["relatives"];
}) {
  const lastImage = useRef(url);
  if (url) lastImage.current = url;
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<"memory" | "relative">("memory");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const items = kind === "memory" ? memories : relatives;
  const ready = Boolean(lastImage.current);
  const targetLabel = kind === "memory" ? "Memory" : "Relative";

  async function apply(k: "hero" | "memory" | "relative", id?: string) {
    if (!lastImage.current) return;
    setBusy(true);
    setDone(null);
    const { ok } = await setFamilyPhoto({ data: { kind: k, id, url: lastImage.current } });
    setBusy(false);
    setDone(
      ok
        ? k === "hero"
          ? "Front-page photo updated."
          : "Photo updated."
        : "Could not save — is the database seeded?",
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <h2 className="font-display text-xl">Use a photo on the site</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Pick the last thing you uploaded, or paste the URL of any Cloudinary image. Current test
        photos have already been uploaded to Cloudinary, so you can also reuse them from the library
        below.
      </p>
      <div className="mt-4">
        <label className="text-xs font-semibold" htmlFor="photo-url">
          Photo URL (from Cloudinary)
        </label>
        <Input
          id="photo-url"
          defaultValue={url ?? ""}
          onChange={(e) => {
            lastImage.current = e.target.value;
          }}
          placeholder="https://res.cloudinary.com/…"
          className="mt-1.5 h-10"
        />
      </div>
      <div className="mt-5 space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => apply("hero")}
          disabled={!ready || busy}
          className="h-11 w-full"
        >
          <Images className="size-4" />
          Set as front-page photo
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setKind("memory")}
            className={`h-10 flex-1 ${kind === "memory" ? "bg-secondary" : ""}`}
          >
            Memory
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setKind("relative")}
            className={`h-10 flex-1 ${kind === "relative" ? "bg-secondary" : ""}`}
          >
            Relative
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="target-item">
              Choose item
            </label>
            <select
              id="target-item"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Choose the photo target"
            >
              <option value="">Choose {targetLabel}…</option>
              {kind === "memory"
                ? memories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))
                : relatives.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={() => apply(kind, target)}
            disabled={!ready || !target || busy}
            className="h-11 shrink-0"
          >
            Set
          </Button>
        </div>
      </div>
      {done && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
          <Check className="size-3.5" />
          {done}
        </p>
      )}
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
    setChildStatus(ok ? "Child details saved." : "Could not save child details.");
  }

  async function saveMemory(id: string, patch: Record<string, string>) {
    const { ok } = await updateMemoryEntry({ data: { id, patch } });
    setEdits((prev) => ({ ...prev, [`m-${id}`]: ok ? "Saved ✓" : "Save failed" }));
    setTimeout(() => setEdits((prev) => ({ ...prev, [`m-${id}`]: "" })), 2500);
  }

  async function saveRelative(id: string, patch: Record<string, string>) {
    const { ok } = await updateRelativeEntry({ data: { id, patch } });
    setEdits((prev) => ({ ...prev, [`r-${id}`]: ok ? "Saved ✓" : "Save failed" }));
    setTimeout(() => setEdits((prev) => ({ ...prev, [`r-${id}`]: "" })), 2500);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-xl">About your child</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">
            Name
            <Input
              value={childForm.name}
              onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
              className="mt-1 h-10"
            />
          </label>
          <label className="text-xs font-semibold">
            Birthdate <span className="font-normal text-muted-foreground">(YYYY-MM-DD)</span>
            <Input
              value={childForm.birthdate}
              onChange={(e) => setChildForm({ ...childForm, birthdate: e.target.value })}
              className="mt-1 h-10"
            />
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold">
          Welcome message
          <Textarea
            value={childForm.welcome}
            onChange={(e) => setChildForm({ ...childForm, welcome: e.target.value })}
            className="mt-1"
          />
        </label>
        <Button type="button" onClick={saveChild} className="mt-3 h-11 w-full sm:w-auto">
          <Save className="size-4" />
          Save details
        </Button>
        {childStatus && <p className="mt-2 text-xs font-medium text-primary">{childStatus}</p>}
      </div>

      <MemForm items={memories} statuses={edits} onSave={saveMemory} />
      <RelForm items={relatives} statuses={edits} onSave={saveRelative} />
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
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <h2 className="font-display text-xl">Edit memories</h2>
      <div className="mt-4 space-y-5">
        {items.map((m) => (
          <fieldset key={m.id} className="rounded-md border border-border/70 bg-background/60 p-4">
            <legend className="px-2 font-display text-sm">{m.title}</legend>
            <div className="grid gap-3">
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={m.title}
                onChange={(e) => setTitle((p) => ({ ...p, [m.id]: e.target.value }))}
                aria-label="Title"
                placeholder="Title"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={m.date}
                onChange={(e) => setDate((p) => ({ ...p, [m.id]: e.target.value }))}
                aria-label="Date"
                placeholder="Date"
              />
              <textarea
                className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={m.story}
                onChange={(e) => setStory((p) => ({ ...p, [m.id]: e.target.value }))}
                aria-label="Story"
                placeholder="Story"
              />
              <div className="flex items-center justify-end gap-3">
                {statuses[`m-${m.id}`] && (
                  <span className="text-xs font-medium text-primary">{statuses[`m-${m.id}`]}</span>
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
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <h2 className="font-display text-xl">Edit relatives</h2>
      <div className="mt-4 space-y-5">
        {items.map((r) => (
          <fieldset key={r.id} className="rounded-md border border-border/70 bg-background/60 p-4">
            <legend className="px-2 font-display text-sm">{r.name}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={r.name}
                onChange={(e) => setName((p) => ({ ...p, [r.id]: e.target.value }))}
                aria-label="Name"
                placeholder="Name"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={r.relationship}
                onChange={(e) => setRelationship((p) => ({ ...p, [r.id]: e.target.value }))}
                aria-label="Relationship"
                placeholder="Relationship"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={r.fact}
                onChange={(e) => setFact((p) => ({ ...p, [r.id]: e.target.value }))}
                aria-label="Fun fact"
                placeholder="Fun fact"
              />
              <textarea
                className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
                defaultValue={r.bio}
                onChange={(e) => setBio((p) => ({ ...p, [r.id]: e.target.value }))}
                aria-label="Bio"
                placeholder="Bio"
              />
              <div className="flex items-center justify-end gap-3 sm:col-span-2">
                {statuses[`r-${r.id}`] && (
                  <span className="text-xs font-medium text-primary">{statuses[`r-${r.id}`]}</span>
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
    </div>
  );
}

function PhotoLibrary({
  photos,
  onDeleted,
}: {
  photos: LoaderData["photos"];
  onDeleted: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  async function remove(publicId: string) {
    setBusyId(publicId);
    const { ok } = await deleteFamilyPhoto({ data: { publicId } });
    setBusyId(null);
    if (ok) onDeleted();
  }
  if (!photos.length)
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <Images className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-3 font-display text-xl">No photos in the cloud yet</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload your first photo above and it will appear here.
        </p>
      </section>
    );
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <h2 className="font-display text-xl">Photo library</h2>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((p) => (
          <div key={p.publicId} className="group relative">
            <img
              src={p.url}
              alt=""
              loading="lazy"
              width={300}
              height={300}
              className="aspect-square w-full rounded-md object-cover"
            />
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

function ManagePage() {
  const data = Route.useLoaderData();
  const [newestUrl, setNewestUrl] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  return (
    <WorldShell>
      <PageIntro
        eyebrow="Family album"
        title="Manage photos"
        text="Upload the real photos, drop them into place, and keep every caption just right. Changes show up on the site immediately."
      />
      <div className="space-y-5 px-5 pb-12 sm:px-8">
        <UploadWidget onUploaded={(url) => setNewestUrl(url)} savedTick={refreshTick} />
        <UsePhotoSection url={newestUrl} memories={data.memories} relatives={data.relatives} />
        <PhotoLibrary photos={data.photos} onDeleted={() => setRefreshTick((t) => t + 1)} />
        <EditDetails child={data.child} memories={data.memories} relatives={data.relatives} />
      </div>
    </WorldShell>
  );
}
