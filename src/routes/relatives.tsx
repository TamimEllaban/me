import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
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
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const groups = ["All", ...new Set(relatives.map((r) => r.group))];
  const shown = relatives.filter(
    (r) =>
      (group === "All" || r.group === group) &&
      `${r.name} ${r.relationship}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <WorldShell>
      <PageIntro
        eyebrow="Your loving circle"
        title="Your people"
        text="A small introduction to every person cheering you on as you grow."
      />
      <div className="px-5 sm:px-8">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Search relatives"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or relationship"
            className="h-11 pl-10"
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
          {shown.map((person) => (
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
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                <DialogTitle className="font-display text-3xl">{person.name}</DialogTitle>
                <p className="text-sm font-semibold text-primary">{person.relationship}</p>
                <DialogDescription className="leading-6">{person.bio}</DialogDescription>
                <div className="rounded-md bg-secondary p-3 text-sm">“{person.fact}”</div>
              </DialogContent>
            </Dialog>
          ))}
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
