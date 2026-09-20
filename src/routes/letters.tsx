import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ImagePlus, Mail, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { addLetterEntry, getLettersData } from "@/lib/gate.functions";

export const Route = createFileRoute("/letters")({
  loader: () => getLettersData(),
  head: () => ({
    meta: [
      { title: "Letters for Later — Tamim's World" },
      { name: "description", content: "Private letters written with love for the years ahead." },
      { property: "og:title", content: "Letters for Later — Tamim's World" },
      {
        property: "og:description",
        content: "Private letters written with love for the years ahead.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LettersPage,
});

function LetterForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [envelope, setEnvelope] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"ok" | "error" | null>(null);

  async function seal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !author.trim() || !message.trim()) {
      setStatus("error");
      return;
    }
    setBusy(true);
    setStatus(null);
    const success = await addLetterEntry({ data: { title, author, date: envelope, message } });
    setBusy(false);
    if (!success) {
      setStatus("error");
      return;
    }
    setStatus("ok");
    setTitle("");
    setAuthor("");
    setEnvelope("");
    setMessage("");
    await router.invalidate();
  }

  return (
    <form onSubmit={seal} className="space-y-4">
      <Input
        placeholder="Letter title"
        aria-label="Letter title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        placeholder="Your name"
        aria-label="Author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      />
      <Input
        placeholder="Open when… (e.g. For your 10th birthday)"
        aria-label="When to open"
        value={envelope}
        onChange={(e) => setEnvelope(e.target.value)}
      />
      <Textarea
        placeholder="Dear Tamim,…"
        aria-label="Message"
        className="min-h-40"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button type="button" variant="outline" className="w-full" onClick={() => setStatus(null)}>
        <ImagePlus />
        Add an optional photo
      </Button>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sealing…" : "Seal this letter"}
      </Button>
      {status === "ok" && (
        <p className="text-center text-xs font-medium text-primary">
          Sealed with love — it will appear above.
        </p>
      )}
      {status === "error" && (
        <p className="text-center text-xs text-destructive">
          Please add a title, your name, and a message.
        </p>
      )}
    </form>
  );
}

function LettersPage() {
  const { letters } = Route.useLoaderData();
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <WorldShell>
      <div className="min-h-[calc(100vh-4rem)]">
        <PageIntro
          eyebrow="For the years ahead"
          title="Letters for when you grow up"
          text="Words from the people who love you, waiting patiently for the right moment."
        />
        <div className="px-5 pb-12 sm:px-8">
          <div className="space-y-4">
            {letters.map((letter) => {
              const open = openId === letter.id;
              return (
                <article
                  key={letter.id}
                  className="overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-all duration-500"
                >
                  <button
                    className="flex min-h-32 w-full items-center gap-4 p-5 text-left"
                    onClick={() => setOpenId(open ? null : letter.id)}
                  >
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-primary shadow-soft">
                      <Mail className="size-6" />
                    </span>
                    <span className="min-w-0">
                      <span className="text-xs font-semibold text-primary">{letter.date}</span>
                      <strong className="mt-1 block font-display text-xl leading-tight">
                        {letter.title}
                      </strong>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        With love, {letter.author}
                      </span>
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-500 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-dashed border-border px-6 py-7 font-display text-lg leading-8">
                        <p>Dear Tamim,</p>
                        <p className="mt-4">{letter.message}</p>
                        <p className="mt-5">
                          Always with love,
                          <br />
                          {letter.author}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="mt-7 h-12 w-full" size="lg">
                <Plus />
                Write a new letter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-3xl">A letter for later</DialogTitle>
                <DialogDescription>
                  Save words for a birthday, a hard day, or simply whenever they're needed.
                </DialogDescription>
              </DialogHeader>
              <LetterForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </WorldShell>
  );
}
