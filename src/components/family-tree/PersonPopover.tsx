import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RelativeLike } from "@/components/relative-editor";
import type { TreeNode } from "@/lib/tree/layoutTree";

/**
 * Floating mini card that appears when an ornament is tapped: name, relation
 * and a short bio, with a button that opens the full edit/photo dialog.
 */
export function PersonPopover({
  node,
  relative,
  onEdit,
  onClose,
}: {
  node: TreeNode;
  relative: RelativeLike;
  onEdit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="w-full">
      <div className="relative rounded-2xl border border-border bg-card/95 p-4 shadow-keepsake backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3">
          {node.photoUrl ? (
            <img
              src={node.photoUrl}
              alt=""
              width={64}
              height={64}
              loading="lazy"
              className="size-16 shrink-0 rounded-full object-cover ring-2 ring-primary/40"
            />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-secondary font-display text-2xl text-foreground">
              {node.name.trim().charAt(0)}
            </span>
          )}
          <div className="min-w-0 pt-1" dir="rtl">
            <h3 className="font-display text-lg leading-tight">{node.name}</h3>
            <p className="text-xs font-semibold text-primary">{node.role}</p>
            <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {relative.bio || relative.fact}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" dir="rtl">
          <Button size="sm" onClick={onEdit}>
            <Camera className="size-4" /> تعديل / صورة
          </Button>
        </div>
      </div>
    </div>
  );
}
