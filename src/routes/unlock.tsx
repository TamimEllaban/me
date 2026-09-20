import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Heart, LockKeyhole } from "lucide-react";
import { useState } from "react";
import hero from "@/assets/hero-child.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUnlockProfiles, unlockSite } from "@/lib/gate.functions";

export const Route = createFileRoute("/unlock")({
  loader: () => getUnlockProfiles(),
  head: () => ({
    meta: [
      { title: "Family entrance — Tamim's World" },
      { name: "description", content: "Private entrance to a family memory capsule." },
      { property: "og:title", content: "Family entrance — Tamim's World" },
      { property: "og:description", content: "Private entrance to a family memory capsule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const { profiles } = Route.useLoaderData();
  const unlock = useServerFn(unlockSite);
  const router = useRouter();
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "family");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const result = await unlock({ data: { password, profileId } });
    if (result.ok) await router.navigate({ to: "/" });
    else setError(true);
    setBusy(false);
  }
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative min-h-[37vh] overflow-hidden lg:min-h-screen">
        <img
          src={hero}
          alt="A happy child in a sunlit room"
          width={1200}
          height={1504}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-wash" />
        <div className="absolute inset-x-0 bottom-0 p-7 text-white lg:p-12">
          <Heart className="mb-3 size-7 fill-current" />
          <p className="font-display text-3xl leading-tight lg:text-5xl">
            The little moments become the biggest treasures.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <form onSubmit={submit} className="w-full max-w-md animate-gentle-in">
          <div className="mb-8">
            <div className="mb-5 flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
              <LockKeyhole className="size-5" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase text-primary">Family only</p>
            <h1 className="font-display text-4xl">
              Welcome to
              <br />
              Tamim's World
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Choose who’s visiting, then enter your family password.
            </p>
          </div>
          <fieldset className="mb-6">
            <legend className="mb-3 text-sm font-semibold">Who’s looking today?</legend>
            <div className="flex gap-3">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setProfileId(profile.id)}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg border p-3 text-xs transition active:scale-95 ${profileId === profile.id ? "border-primary bg-secondary text-foreground" : "border-border text-muted-foreground"}`}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent font-display text-base text-accent-foreground">
                    {profile.initials}
                  </span>
                  <span className="truncate">{profile.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="text-sm font-semibold" htmlFor="password">
            Family password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="mt-2 h-12"
            required
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              That password doesn’t match. Please try again.
            </p>
          )}
          <Button type="submit" size="lg" className="mt-5 h-12 w-full" disabled={busy}>
            {busy ? "Opening…" : "Enter our family space"}
          </Button>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Private and shared only with the people you love.
          </p>
        </form>
      </div>
    </main>
  );
}
