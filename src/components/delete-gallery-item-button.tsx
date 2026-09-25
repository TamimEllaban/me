import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteGalleryItemEntry } from "@/lib/gate.functions";

export function DeleteGalleryItemButton({
  id,
  itemName,
  onDone,
  trigger,
  compact = false,
}: {
  id: string;
  itemName: string;
  onDone: () => void | Promise<void>;
  trigger?: ReactNode;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await deleteGalleryItemEntry({ data: { id } });
    if (!result.ok) {
      setError("تعذر حذف العنصر. تأكد من الاتصال ثم حاول مرة أخرى.");
      setBusy(false);
      return;
    }
    setOpen(false);
    setBusy(false);
    await onDone();
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            size={compact ? "icon" : "sm"}
            variant="destructive"
            aria-label={`حذف ${itemName} من الألبوم`}
            title="حذف من الألبوم"
          >
            <Trash2 className="size-4" />
            {!compact && "حذف من الألبوم"}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl">حذف “{itemName}”؟</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            سيختفي هذا العنصر من ألبوم Gallery. لن يتم حذف الملف الأصلي من مكتبة Cloudinary، لذلك
            يمكن استخدامه مرة أخرى من Manage.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {busy ? "جارٍ الحذف…" : "نعم، احذف من الألبوم"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
