import { createFileRoute } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { GitBranch, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  RelativeFormDialog,
  RemoveRelativeButton,
  type RelativeLike,
} from "@/components/relative-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { getRelativesData } from "@/lib/gate.functions";

export const Route = createFileRoute("/relatives")({
  loader: () => getRelativesData(),
  head: () => ({
    meta: [
      { title: "Relatives — Tamim's World" },
      {
        name: "description",
        content: "Meet the family members who fill this child's world with love.",
      },
      { property: "og:title", content: "Relatives — Tamim's World" },
      {
        property: "og:description",
        content: "Meet the people who fill this child's world with love.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelativesPage,
});

function RelativesPage() {
  const { relatives } = Route.useLoaderData();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const groups = ["All", ...new Set(relatives.map((r) => r.group))];
  const shown = relatives.filter(
    (r) =>
      (group === "All" || r.group === group) &&
      `${r.name} ${r.relationship}`.toLowerCase().includes(query.toLowerCase()),
  );
  const refresh = () => {
    router.invalidate();
  };

  return (
    <WorldShell>
      <PageIntro
        eyebrow="Your loving circle"
        title="Your people"
        text="Tap anyone to see their card — you can add branches, edit names or add their photo."
      />
      <div className="px-5 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input
              aria-label="Search relatives"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or relationship"
              className="h-11 pl-10"
            />
          </div>
          <RelativeFormDialog
            mode="create"
            relatives={relatives}
            onDone={refresh}
            trigger={
              <Button className="h-11 shrink-0">
                <Plus className="size-4" /> Add person
              </Button>
            }
          />
        </div>
        <div className="no-scrollbar my-4 flex gap-2 overflow-auto">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-medium ${group === g ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pb-10 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((person) => {
            const rel = person as RelativeLike;
            return (
              <Dialog key={person.id}>
                <DialogTrigger asChild>
                  <button className="min-h-64 rounded-lg border border-border bg-card p-3 text-left shadow-soft transition active:scale-[.98]">
                    <img
                      src={person.image}
                      alt=""
                      width={1200}
                      height={912}
                      loading="lazy"
                      className="aspect-square w-full rounded-md object-cover"
                    />
                    <h2 className="mt-3 truncate font-display text-xl">{person.name}</h2>
                    <p className="text-xs font-semibold text-primary">{person.relationship}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {person.fact}
                    </p>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <img
                    src={person.image}
                    alt=""
                    width={1200}
                    height={912}
                    className="max-h-[60vh] w-full rounded-lg bg-background object-contain"
                  />
                  <DialogTitle className="font-display text-3xl">{person.name}</DialogTitle>
                  <p className="text-sm font-semibold text-primary">{person.relationship}</p>
                  <DialogDescription className="leading-6">{person.bio}</DialogDescription>
                  <div className="rounded-md bg-secondary p-3 text-sm">“{person.fact}”</div>
                  <div className="flex flex-wrap gap-2">
                    <RelativeFormDialog
                      mode="child"
                      parent={rel}
                      relatives={relatives}
                      onDone={refresh}
                      trigger={
                        <Button size="sm">
                          <GitBranch className="size-4" /> Add branch under them
                        </Button>
                      }
                    />
                    <RelativeFormDialog
                      mode="edit"
                      person={rel}
                      relatives={relatives}
                      onDone={refresh}
                      trigger={
                        <Button size="sm" variant="secondary">
                          <Pencil className="size-4" /> Edit
                        </Button>
                      }
                    />
                    <RemoveRelativeButton
                      person={rel}
                      onDone={refresh}
                      trigger={
                        <Button size="sm" variant="secondary" className="text-destructive">
                          <Trash2 className="size-4" /> Remove
                        </Button>
                      }
                    />
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
        {shown.length === 0 && (
          <div className="py-20 text-center">
            <span className="text-4xl">♡</span>
            <h2 className="mt-3 font-display text-2xl">No one here yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different name or family group.
            </p>
          </div>
        )}
      </div>
    </WorldShell>
  );
}
