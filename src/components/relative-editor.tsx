import { useState, type ReactNode } from "react";
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
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
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
          <Label>
            Name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11"
              placeholder="الاسم"
            />
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label>
              Relationship
              <Input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="mt-1 h-11"
                placeholder="بابا / ماما / خالة..."
              />
            </Label>
            <Label>
              Family group
              <Input
                list="relative-groups"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="mt-1 h-11"
              />
              <datalist id="relative-groups">
                {GROUP_SUGGESTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Label>
          </div>
          <Label>
            Photo URL{" "}
            <span className="font-normal text-muted-foreground">(اختياري — أضفها بعدين)</span>
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="mt-1 h-11"
              placeholder="https://res.cloudinary.com/..."
            />
          </Label>
          <Label>
            One nice thing <span className="font-normal text-muted-foreground">(fact)</span>
            <Input
              value={fact}
              onChange={(e) => setFact(e.target.value)}
              className="mt-1 h-11"
              placeholder="حاجة حلوة عنه/عنها"
            />
          </Label>
          <Label>
            About them
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="mt-1 resize-none"
              placeholder="كلمتين عنهم"
            />
          </Label>
          <Label>
            فرع من (branch under)
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          </Label>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
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
