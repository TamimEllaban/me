import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloudUpload, LoaderCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function UploadBusyOverlay({
  open,
  progress,
  title = "جارٍ رفع الملفات",
  subtitle,
}: {
  open: boolean;
  progress: number;
  title?: string;
  subtitle?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const siblings = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    const previousState = siblings.map((element) => ({
      element,
      inert: element.hasAttribute("inert"),
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    const overlay = overlayRef.current;
    for (const element of siblings) {
      if (element !== overlay) {
        element.setAttribute("inert", "");
        element.setAttribute("aria-hidden", "true");
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const blockKeyboardInteraction = (event: KeyboardEvent) => event.preventDefault();
    document.addEventListener("keydown", blockKeyboardInteraction, true);
    overlay?.focus();
    return () => {
      document.removeEventListener("keydown", blockKeyboardInteraction, true);
      document.body.style.overflow = previousOverflow;
      for (const state of previousState) {
        if (!state.inert) state.element.removeAttribute("inert");
        if (state.ariaHidden === null) state.element.removeAttribute("aria-hidden");
        else state.element.setAttribute("aria-hidden", state.ariaHidden);
      }
      previousFocus?.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-5 backdrop-blur-md"
    >
      <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-card p-6 text-card-foreground shadow-2xl sm:p-8 2xl:max-w-2xl 2xl:p-10">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary 2xl:size-16">
            <CloudUpload className="size-7 2xl:size-8" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold 2xl:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground 2xl:text-base">
              {subtitle || "محتار ترفع الصور والفيديوهات الآن. استنى لحد ما العملية تخلص."}
            </p>
          </div>
          <LoaderCircle className="ms-auto size-6 shrink-0 animate-spin text-primary" />
        </div>

        <div className="mt-7 flex items-end justify-between gap-4" dir="ltr">
          <span className="text-sm font-semibold text-muted-foreground">UPLOAD PROGRESS</span>
          <strong className="font-display text-4xl tabular-nums text-primary 2xl:text-5xl">
            {safeProgress}%
          </strong>
        </div>
        <Progress value={safeProgress} className="mt-3 h-3 2xl:h-4" />
        <p className="mt-4 text-center text-xs text-muted-foreground 2xl:text-sm">
          المتصفح مقفل مؤقتًا أثناء الرفع حتى لا يتغيّر أي شيء بالخطأ.
        </p>
      </div>
    </div>,
    document.body,
  );
}
