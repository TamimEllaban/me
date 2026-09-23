/* eslint-disable react-hooks/rules-of-hooks */
// useSession from @tanstack/react-start/server is a server-side context helper,
// not a React hook, despite returning a promise and being named use*.
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  addGalleryItem,
  addLetter as dbAddLetter,
  addMemory as dbAddMemory,
  addRelative as dbAddRelative,
  deleteRelative as dbDeleteRelative,
  loadGalleryItems,
  loadGalleryOverrides,
  updateChild as dbUpdateChild,
  updateGalleryItemCategory as dbUpdateGalleryItemCategory,
  updateMemory,
  updateMemoryImage,
  updateRelative,
  updateRelativeImage,
} from "./db";
import {
  createFamilyUploadTicket,
  deleteFamilyImage,
  listFamilyImages,
  uploadFamilyImage,
} from "./cloudinary.server";
import { getChild, getLetters, getMemories, getProfiles, getRelatives } from "./world-data.server";
import mediaCatalog from "./media-catalog.json";

type FamilySession = { unlocked?: boolean; profileId?: string };

function getSessionConfig() {
  return {
    password:
      process.env["SESSION_SECRET"] ||
      "tamim-world-family-default-session-secret-key-min-32-chars!",
    name: "family-world",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax" as const,
      path: "/",
    },
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
  child: await getChild(),
  defaultPassword: process.env["SITE_PASSWORD"] ?? "",
}));

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireUnlocked();
  const memories = await getMemories();
  return {
    child: await getChild(),
    memories: memories.slice(-2),
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

// --- Media gallery (from the Cloudinary library catalog) ---

export type GalleryItem = {
  id: string;
  kind: "image" | "video";
  sourceName: string;
  category: string;
  date: string;
  url: string;
  thumb: string;
};

function optimizeUrl(url: string, width: number): string {
  if (!/res\.cloudinary\.com/.test(url)) return url;
  return url.replace("/image/upload/", `/image/upload/w_${width},f_auto,q_auto/`);
}

function videoThumbUrl(url: string): string {
  if (!/res\.cloudinary\.com/.test(url)) return url;
  return url.replace("/video/upload/", "/video/upload/so_1,f_jpg,q_auto,w_800/");
}

export type GalleryCategory = { name: string; items: GalleryItem[] };

export const getGalleryData = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const raw = (mediaCatalog as { items: GalleryItem[] }).items;
  const [dbItems, overrides] = await Promise.all([
    loadGalleryItems(),
    loadGalleryOverrides(),
  ]);
  const overrideMap = new Map(overrides.map((o) => [o.id, o.category]));

  const allRaw: GalleryItem[] = [
    ...dbItems.map((d) => ({
      id: d.id,
      kind: d.kind,
      sourceName: d.sourceName,
      category: overrideMap.get(d.id) || d.category,
      date: d.date,
      url: d.url,
      thumb: d.kind === "video" ? videoThumbUrl(d.url) : optimizeUrl(d.url, 640),
    })),
    ...raw.map((r) => ({
      ...r,
      category: overrideMap.get(r.id) || r.category,
    })),
  ];
  const items: GalleryItem[] = allRaw.map((item) => ({
    ...item,
    thumb:
      item.thumb || (item.kind === "video" ? videoThumbUrl(item.url) : optimizeUrl(item.url, 640)),
  }));
  items.sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      (b.date || "").localeCompare(a.date || "") ||
      a.sourceName.localeCompare(b.sourceName, "ar"),
  );
  const categories: GalleryCategory[] = [];
  for (const item of items) {
    const last = categories[categories.length - 1];
    if (last && last.name === item.category) last.items.push(item);
    else categories.push({ name: item.category, items: [item] });
  }
  const counts = {
    images: items.filter((i) => i.kind === "image").length,
    videos: items.filter((i) => i.kind === "video").length,
  };
  return { categories, counts };
});

export const moveGalleryItemCategory = createServerFn({ method: "POST" })
  .inputValidator(({ id, category }: { id: string; category: string }) => ({ id, category }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    return await dbUpdateGalleryItemCategory(data.id, data.category);
  });

// --- Family admin: Cloudinary photo upload / delete + wiring into the site ---

export const uploadFamilyPhoto = createServerFn({ method: "POST" })
  .inputValidator(({ source, name }: { source: string; name: string }) => ({ source, name }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    return await uploadFamilyImage(data.source, data.name);
  });

// Issues a one-time signature so the browser can POST the photo bytes
// straight to Cloudinary. This skips our server entirely, so huge photos
// never hit Vercel's request-body size limit.
export const getFamilyUploadTicket = createServerFn({ method: "POST" })
  .inputValidator(({ name }: { name: string }) => ({ name }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    return createFamilyUploadTicket(data.name);
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
      name,
      category,
      date,
      story,
      excerpt,
    }: {
      kind: "hero" | "memory" | "relative" | "gallery";
      id?: string | undefined;
      url: string;
      name?: string | undefined;
      category?: string | undefined;
      date?: string | undefined;
      story?: string | undefined;
      excerpt?: string | undefined;
    }) => ({ kind, id, url, name, category, date, story, excerpt }),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    let ok = false;
    if (data.kind === "hero") {
      ok = await dbUpdateChild({ hero_image: data.url });
    } else if (data.kind === "gallery") {
      const res = await addGalleryItem({
        sourceName: data.name || "Family photo",
        category: data.category || "03 - تميم وهو صغير",
        date: data.date || "",
        url: data.url,
        kind: "image",
      });
      ok = res.ok;
    } else if (data.kind === "memory") {
      if (data.id === "new" || !data.id) {
        const res = await dbAddMemory({
          title: data.name || "New Memory",
          date: data.date || new Date().toISOString().slice(0, 10),
          category: data.category || "Milestones",
          image: data.url,
          excerpt: data.excerpt || "",
          story: data.story || "",
        });
        ok = res.ok;
      } else {
        ok = await updateMemoryImage(data.id, data.url);
      }
    } else if (data.kind === "relative" && data.id) {
      ok = await updateRelativeImage(data.id, data.url);
    }
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
      patch: {
        name?: string;
        relationship?: string;
        group?: string;
        image?: string;
        fact?: string;
        bio?: string;
        parentId?: string | null;
        spouseId?: string | null;
      };
    }) => ({ id, patch }),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    return { ok: await updateRelative(data.id, data.patch) };
  });

export const addRelativeEntry = createServerFn({ method: "POST" })
  .inputValidator(
    ({
      name,
      relationship,
      group,
      image,
      fact,
      bio,
      parentId,
      spouseId,
    }: {
      name: string;
      relationship?: string;
      group?: string;
      image?: string;
      fact?: string;
      bio?: string;
      parentId?: string | null;
      spouseId?: string | null;
    }) => ({
      name,
      relationship: relationship ?? "",
      group: group ?? "Family",
      image: image ?? "",
      fact: fact ?? "",
      bio: bio ?? "",
      parentId: parentId ?? null,
      spouseId: spouseId ?? null,
    }),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    return await dbAddRelative(data);
  });

export const deleteRelativeEntry = createServerFn({ method: "POST" })
  .inputValidator(({ id }: { id: string }) => ({ id }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    return await dbDeleteRelative(data.id);
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
