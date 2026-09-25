import { GitBranch, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  RelativeFormDialog,
  RemoveRelativeButton,
  type RelativeLike,
} from "@/components/relative-editor";
import { DEFAULT_RELATIVE_IMAGE } from "@/lib/default-relative-image";

/**
 * The full person dialog (photo / name / bio / add-branch / edit / remove) —
 * the same one the old tree and the Relatives page used.
 */
export function PersonDialog({
  person,
  relatives,
  onDone,
  open,
  onOpenChange,
}: {
  person: RelativeLike;
  relatives: RelativeLike[];
  onDone: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {person.image && person.image !== DEFAULT_RELATIVE_IMAGE ? (
          <img
            src={person.image}
            alt=""
            width={1200}
            height={912}
            loading="lazy"
            decoding="async"
            className="max-h-[60vh] w-full rounded-lg bg-background object-contain"
          />
        ) : (
          <span className="grid h-36 w-full place-items-center rounded-lg bg-secondary font-display text-6xl text-foreground">
            {person.name.trim().charAt(0)}
          </span>
        )}
        <DialogTitle className="font-display text-3xl">{person.name}</DialogTitle>
        <p className="text-sm font-semibold text-primary">{person.relationship}</p>
        <DialogDescription className="leading-6">{person.bio}</DialogDescription>
        <div className="flex flex-wrap gap-2" dir="rtl">
          <RelativeFormDialog
            mode="child"
            parent={person}
            relatives={relatives}
            onDone={onDone}
            trigger={
              <Button size="sm">
                <GitBranch className="size-4" /> إضافة ابن
              </Button>
            }
          />
          <RelativeFormDialog
            mode="edit"
            person={person}
            relatives={relatives}
            onDone={onDone}
            trigger={
              <Button size="sm" variant="secondary">
                <Pencil className="size-4" /> تعديل
              </Button>
            }
          />
          <RemoveRelativeButton
            person={person}
            onDone={onDone}
            trigger={
              <Button size="sm" variant="secondary" className="text-destructive">
                <Trash2 className="size-4" /> إزالة
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
