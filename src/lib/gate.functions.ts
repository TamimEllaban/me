/* eslint-disable react-hooks/rules-of-hooks */
// useSession from @tanstack/react-start/server is a server-side context helper,
// not a React hook, despite returning a promise and being named use*.
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  addLetter as dbAddLetter,
  updateChild as dbUpdateChild,
  updateMemory,
  updateMemoryImage,
  updateRelative,
  updateRelativeImage,
} from "./db";
import { deleteFamilyImage, listFamilyImages, uploadFamilyImage } from "./cloudinary.server";
import { getChild, getLetters, getMemories, getProfiles, getRelatives } from "./world-data.server";

type FamilySession = { unlocked?: boolean; profileId?: string };

function getSessionConfig() {
  return {
    password:
      process.env["SESSION_SECRET"] ||
      "tamim-world-family-default-session-secret-key-min-32-chars!",
    name: "family-world",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" },
  };
}

function matches(input: string, expected: string) {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

async function requireUnlocked() {
  const session = await useSession<FamilySession>(getSessionConfig());
  if (!session.data.unlocked) throw redirect({ to: "/unlock" });
  return session;
}

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string; profileId: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected || !matches(data.password, expected)) return { ok: false as const };
    const session = await useSession<FamilySession>(getSessionConfig());
    await session.update({ unlocked: true, profileId: data.profileId });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<FamilySession>(getSessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const getUnlockProfiles = createServerFn({ method: "GET" }).handler(async () => ({
  profiles: await getProfiles(),
}));

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireUnlocked();
  const memories = await getMemories();
  return {
    child: await getChild(),
    memories: memories.slice(0, 2),
    profileId: session.data.profileId ?? "family",
  };
});
export const getMemoriesData = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  return { child: await getChild(), memories: await getMemories() };
});
export const getFamilyData = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  return { child: await getChild(), relatives: await getRelatives() };
});
export const getRelativesData = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  return { child: await getChild(), relatives: await getRelatives() };
});
export const getLettersData = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  return { child: await getChild(), letters: await getLetters() };
});

// --- Family admin: Cloudinary photo upload / delete + wiring into the site ---

export const uploadFamilyPhoto = createServerFn({ method: "POST" })
  .inputValidator(({ source, name }: { source: string; name: string }) => ({ source, name }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    return await uploadFamilyImage(data.source, data.name);
  });

export const deleteFamilyPhoto = createServerFn({ method: "POST" })
  .inputValidator(({ publicId }: { publicId: string }) => ({ publicId }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    return { ok: await deleteFamilyImage(data.publicId) };
  });

export const listFamilyPhotos = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  return { photos: await listFamilyImages() };
});

export const setFamilyPhoto = createServerFn({ method: "POST" })
  .inputValidator(
    ({
      kind,
      id,
      url,
    }: {
      kind: "hero" | "memory" | "relative";
      id?: string | undefined;
      url: string;
    }) => ({ kind, id, url }),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    let ok = false;
    if (data.kind === "hero") ok = await dbUpdateChild({ hero_image: data.url });
    else if (data.kind === "memory" && data.id) ok = await updateMemoryImage(data.id, data.url);
    else if (data.kind === "relative" && data.id) ok = await updateRelativeImage(data.id, data.url);
    return { ok };
  });

export const setFamilyDetails = createServerFn({ method: "POST" })
  .inputValidator(
    ({ name, birthdate, welcome }: { name?: string; birthdate?: string; welcome?: string }) => ({
      name,
      birthdate,
      welcome,
    }),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const patch: { name?: string; birthdate?: string; welcome?: string } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.birthdate !== undefined) patch.birthdate = data.birthdate;
    if (data.welcome !== undefined) patch.welcome = data.welcome;
    return { ok: await dbUpdateChild(patch) };
  });

export const updateMemoryEntry = createServerFn({ method: "POST" })
  .inputValidator(
    ({
      id,
      patch,
    }: {
      id: string;
      patch: { title?: string; date?: string; category?: string; excerpt?: string; story?: string };
    }) => ({ id, patch }),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    return { ok: await updateMemory(data.id, data.patch) };
  });

export const updateRelativeEntry = createServerFn({ method: "POST" })
  .inputValidator(
    ({
      id,
      patch,
    }: {
      id: string;
      patch: { name?: string; relationship?: string; group?: string; fact?: string; bio?: string };
    }) => ({ id, patch }),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    return { ok: await updateRelative(data.id, data.patch) };
  });

export const addLetterEntry = createServerFn({ method: "POST" })
  .inputValidator(
    ({
      title,
      author,
      date,
      message,
    }: {
      title: string;
      author: string;
      date: string;
      message: string;
    }) => ({
      title: title.trim().slice(0, 120),
      author: author.trim().slice(0, 60),
      date: date.trim().slice(0, 120) || "Open when you're ready",
      message: message.trim(),
    }),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    return { ok: await dbAddLetter(data) };
  });
