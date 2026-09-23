import { useRef, useState, type ReactNode } from "react";
import { Camera, Upload } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addRelativeEntry, deleteRelativeEntry, updateRelativeEntry } from "@/lib/gate.functions";
import { uploadPhotoDirect } from "@/lib/photo-upload";

export type RelativeLike = {
  id: string;
  name: string;
  relationship: string;
  group: string;
  image: string;
  fact: string;
  bio: string;
  parentId: string | null;
  spouseId: string | null;
};

const GROUP_SUGGESTIONS = [
  "Parents",
  "Grandparents",
  "Aunts & Uncles",
  "Cousins",
  "Great aunts & uncles",
  "Family",
];

export function RelativeFormDialog({
  trigger,
  mode,
  person,
  parent,
  relatives,
  onDone,
}: {
  trigger: ReactNode;
  mode: "create" | "child" | "edit";
  person?: RelativeLike;
  parent?: RelativeLike;
  relatives: RelativeLike[];
  onDone: () => void;
}) {
  const editing = mode === "edit";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(editing ? person!.name : "");
  const [relationship, setRelationship] = useState(editing ? person!.relationship : "");
  const [group, setGroup] = useState(editing ? person!.group : parent ? parent.group : "Family");
  const [image, setImage] = useState(editing ? person!.image : "");
  const [fact, setFact] = useState(editing ? person!.fact : "");
  const [bio, setBio] = useState(editing ? person!.bio : "");
  const [parentId, setParentId] = useState<string | "">(
    editing ? (person!.parentId ?? "") : parent ? parent.id : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  async function handlePhotoFile(file: File) {
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await uploadPhotoDirect(file);
      if (res) {
        setImage(res);
        setUploadMsg("تم رفع الصورة ✓");
      } else {
        setUploadMsg("حصلت مشكلة في الرفع — جرب تاني.");
      }
    } catch {
      setUploadMsg("حصلت مشكلة في قراءة الصورة.");
    }
    setUploading(false);
  }

  async function submit() {
    if (!name.trim()) {
      setError("Give them a name first.");
      return;
    }
    setBusy(true);
    setError(null);
    if (editing && person) {
      const { ok } = await updateRelativeEntry({
        data: {
          id: person.id,
          patch: {
            name: name.trim(),
            relationship: relationship.trim() || person.relationship,
            group: group.trim() || person.group,
            image: image.trim() || person.image,
            fact: fact.trim(),
            bio: bio.trim(),
            parentId: parentId ? parentId : null,
            spouseId: person.spouseId,
          },
        },
      });
      if (!ok) setError("Could not save — try again.");
      else {
        setOpen(false);
        onDone();
      }
    } else {
      const { ok } = await addRelativeEntry({
        data: {
          name: name.trim(),
          relationship: relationship.trim(),
          group: group.trim() || "Family",
          image: image.trim(),
          fact: fact.trim(),
          bio: bio.trim(),
          parentId: parentId ? parentId : null,
        },
      });
      if (!ok) setError("Could not add — try again.");
      else {
        setOpen(false);
        onDone();
      }
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92svh] w-[calc(100%-2rem)] overflow-y-auto max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editing
              ? `Edit ${person!.name}`
              : mode === "child"
                ? "Add a new branch"
                : "Add a person"}
          </DialogTitle>
          <DialogDescription>
            {mode === "child" && parent
              ? `فرع جديد تحت ${parent.name}.`
              : "Add someone from the family. You can add their photo later from the Relatives page."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="block" htmlFor="rel-name">
              Name
            </Label>
            <Input
              id="rel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              placeholder="الاسم"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="block" htmlFor="rel-relationship">
                Relationship
              </Label>
              <Input
                id="rel-relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="h-11"
                placeholder="بابا / ماما / خالة..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="block" htmlFor="rel-group">
                Family group
              </Label>
              <Input
                id="rel-group"
                list="relative-groups"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="h-11"
              />
              <datalist id="relative-groups">
                {GROUP_SUGGESTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="block">Photo</Label>
            {image && (
              <img
                src={image}
                alt=""
                className="max-h-48 w-full rounded-lg border border-border bg-background object-contain"
              />
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePhotoFile(file);
                  e.target.value = "";
                }}
              />
              <input
                ref={camRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePhotoFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" /> {uploading ? "جاري الرفع…" : "رفع صورة"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => camRef.current?.click()}
              >
                <Camera className="size-4" /> الكاميرا
              </Button>
            </div>
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="h-11"
              placeholder="أو االصق رابط صورة مباشر هنا"
            />
            {uploadMsg && <p className="text-xs text-muted-foreground">{uploadMsg}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="block" htmlFor="rel-fact">
              One nice thing <span className="font-normal text-muted-foreground">(fact)</span>
            </Label>
            <Input
              id="rel-fact"
              value={fact}
              onChange={(e) => setFact(e.target.value)}
              className="h-11"
              placeholder="حاجة حلوة عنه/عنها"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="block" htmlFor="rel-bio">
              About them
            </Label>
            <Textarea
              id="rel-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="كلمتين عنهم"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="block" htmlFor="rel-parent">
              فرع من (branch under)
            </Label>
            <select
              id="rel-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— من غير فرع (at the top) —</option>
              {relatives
                .filter((r) => !editing || r.id !== person!.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} • {r.relationship || r.group}
                  </option>
                ))}
            </select>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="w-full sm:w-auto">
            {busy
              ? "Saving…"
              : editing
                ? "Save changes"
                : mode === "child"
                  ? "Add as a branch"
                  : "Add person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveRelativeButton({
  person,
  trigger,
  onDone,
}: {
  person: RelativeLike;
  trigger: ReactNode;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await deleteRelativeEntry({ data: { id: person.id } });
    if (!res.ok) {
      setError(res.reason ?? "Could not remove this person.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setOpen(false);
    onDone();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl">
            Remove {person.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes them from the family tree and Relatives page. No one can be removed while
            they still have branches under them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Keep them</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={remove} disabled={busy}>
              {busy ? "Removing…" : "Yes, remove"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
    </AlertDialog>
  );
}
