// Thin Postgres (Neon) data layer.
//
// Every loader returns `null` when the database is not configured or
// unreachable, so callers can fall back to bundled placeholder content.
// Results are cached briefly per server process to keep page renders snappy.

import { Pool } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { DEFAULT_RELATIVE_IMAGE } from "@/lib/default-relative-image";

const CACHE_TTL_MS = 30_000;

type CacheEntry<T> = { at: number; value: T };
type Loader<T> = () => Promise<T>;

let pool: Pool | null | undefined;

function getPool(): Pool | null {
  const url = process.env["DATABASE_URL"];
  if (!url) return null;
  if (pool === undefined) {
    pool = new Pool({
      connectionString: url,
      max: 5,
      connectionTimeoutMillis: 6_000,
    });
  }
  return pool;
}

const cache = new Map<string, CacheEntry<unknown>>();

async function withCache<T>(key: string, loader: Loader<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await loader();
  cache.set(key, { at: Date.now(), value });
  return value;
}

function invalidate(keys: string[]) {
  for (const key of keys) cache.delete(key);
}

async function query<T>(sql: string, params: unknown[] = []): Promise<T[] | null> {
  const client = getPool();
  if (!client) return null;
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (error) {
    console.error("[db] query failed, falling back to placeholder data:", error);
    return null;
  }
}

export type ChildRow = {
  name: string;
  birthdate: string;
  welcome: string;
  hero_image: string | null;
};
export type MemoryRow = {
  id: string;
  title: string;
  date: string;
  category: string;
  image: string;
  excerpt: string;
  story: string;
  sort_order: number;
};
export type RelativeRow = {
  id: string;
  name: string;
  relationship: string;
  group: string;
  image: string;
  fact: string;
  bio: string;
  sort_order: number;
  parentId: string | null;
  spouseId: string | null;
};
export type LetterRow = {
  id: string;
  title: string;
  author: string;
  date: string;
  message: string;
};
export type ProfileRow = { id: string; name: string; initials: string };
export type GalleryItemRow = {
  id: string;
  kind: "image" | "video";
  sourceName: string;
  category: string;
  date: string;
  url: string;
  thumbnailUrl: string | null;
};

const CHILD_SQL = `SELECT name, birthdate::text AS birthdate, welcome, hero_image FROM child WHERE id = 1 LIMIT 1`;
const MEMORIES_SQL = `SELECT id, title, date, category, image, excerpt, story, sort_order FROM memories ORDER BY sort_order ASC`;
const RELATIVES_SQL = `SELECT id, name, relationship, "group", image, fact, bio, sort_order, parent_id AS "parentId", spouse_id AS "spouseId" FROM relatives ORDER BY sort_order ASC`;
const LETTERS_SQL = `SELECT id, title, author, date, message FROM letters ORDER BY created_at ASC, id ASC`;
const PROFILES_SQL = `SELECT id, name, initials FROM profiles ORDER BY created_at ASC, id ASC`;
const GALLERY_SQL = `SELECT id, kind, source_name AS "sourceName", category, date, url, thumbnail_url AS "thumbnailUrl" FROM gallery_items ORDER BY created_at DESC, id DESC`;

export const loadChild = () =>
  withCache<ChildRow | null>("child", async () => {
    const rows = await query<ChildRow>(CHILD_SQL);
    return rows && rows.length ? { ...rows[0]! } : null;
  });

export const loadMemories = () =>
  withCache<MemoryRow[]>("memories", async () => (await query<MemoryRow>(MEMORIES_SQL)) ?? []);

export const loadRelatives = () =>
  withCache<RelativeRow[]>(
    "relatives",
    async () => (await query<RelativeRow>(RELATIVES_SQL)) ?? [],
  );

export const loadLetters = () =>
  withCache<LetterRow[]>("letters", async () => (await query<LetterRow>(LETTERS_SQL)) ?? []);

export const loadProfiles = () =>
  withCache<ProfileRow[]>("profiles", async () => (await query<ProfileRow>(PROFILES_SQL)) ?? []);

export const loadGalleryItems = () =>
  withCache<GalleryItemRow[]>(
    "gallery_items",
    async () => (await query<GalleryItemRow>(GALLERY_SQL)) ?? [],
  );

export type GalleryOverrideRow = { id: string; category: string };
const GALLERY_OVERRIDES_SQL = `SELECT id, category FROM gallery_overrides`;

export const loadGalleryOverrides = () =>
  withCache<GalleryOverrideRow[]>(
    "gallery_overrides",
    async () => (await query<GalleryOverrideRow>(GALLERY_OVERRIDES_SQL)) ?? [],
  );

export async function updateChild(patch: {
  name?: string | undefined;
  birthdate?: string | undefined;
  welcome?: string | undefined;
  hero_image?: string | null | undefined;
}): Promise<boolean> {
  const client = getPool();
  if (!client) return false;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    values.push(value);
    sets.push(`"${key}" = $${values.length}`);
  }
  if (!sets.length) return true;
  try {
    await client.query(`UPDATE child SET ${sets.join(", ")} WHERE id = 1`, values);
    invalidate(["child"]);
    return true;
  } catch (error) {
    console.error("[db] updateChild failed:", error);
    return false;
  }
}

export async function updateMemoryImage(id: string, image: string): Promise<boolean> {
  return updateField("memories", id, { image });
}

export async function updateRelativeImage(id: string, image: string): Promise<boolean> {
  return updateField("relatives", id, { image });
}

export async function updateMemory(
  id: string,
  patch: Partial<Pick<MemoryRow, "title" | "date" | "category" | "image" | "excerpt" | "story">>,
): Promise<boolean> {
  return updateField("memories", id, patch);
}

export async function updateRelative(
  id: string,
  patch: Partial<
    Pick<
      RelativeRow,
      "name" | "relationship" | "group" | "image" | "fact" | "bio" | "parentId" | "spouseId"
    >
  >,
): Promise<boolean> {
  const dbPatch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const column = key === "parentId" ? "parent_id" : key === "spouseId" ? "spouse_id" : key;
    dbPatch[column] = value;
  }
  return updateField("relatives", id, dbPatch);
}

export { DEFAULT_RELATIVE_IMAGE };

export async function addRelative(input: {
  name: string;
  relationship: string;
  group: string;
  image?: string | undefined;
  fact?: string | undefined;
  bio?: string | undefined;
  parentId?: string | null | undefined;
  spouseId?: string | null | undefined;
}): Promise<{ ok: boolean; id?: string }> {
  const client = getPool();
  if (!client) return { ok: false };
  try {
    const nextOrder = await query<{ next: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM relatives`,
    );
    const sortOrder = nextOrder && nextOrder.length ? nextOrder[0]!.next : 1;
    const id = sqlUuid();
    await client.query(
      `INSERT INTO relatives (id, name, relationship, "group", image, fact, bio, parent_id, spouse_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        input.name.trim().slice(0, 120),
        input.relationship || "من العيلة",
        input.group || "Family",
        input.image || DEFAULT_RELATIVE_IMAGE,
        input.fact ?? "",
        input.bio ?? "",
        input.parentId ?? null,
        input.spouseId ?? null,
        sortOrder,
      ],
    );
    invalidate(["relatives"]);
    return { ok: true, id };
  } catch (error) {
    console.error("[db] addRelative failed:", error);
    return { ok: false };
  }
}

export async function deleteRelative(id: string): Promise<{ ok: boolean; reason?: string }> {
  const client = getPool();
  if (!client) return { ok: false };
  const rows = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM relatives WHERE parent_id = $1`,
    [id],
  );
  if (rows && rows.length && rows[0]!.n > 0) {
    return {
      ok: false,
      reason: "This person has branches. Remove them first, or move them to someone else.",
    };
  }
  try {
    await client.query(`DELETE FROM relatives WHERE id = $1`, [id]);
    invalidate(["relatives"]);
    return { ok: true };
  } catch (error) {
    console.error("[db] deleteRelative failed:", error);
    return { ok: false };
  }
}

function sqlUuid(): string {
  const bytes = new Uint8Array(randomBytes(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function addLetter(input: {
  title: string;
  author: string;
  date: string;
  message: string;
}): Promise<boolean> {
  const client = getPool();
  if (!client) return false;
  try {
    await client.query(
      `INSERT INTO letters (id, title, author, date, message, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, now())`,
      [input.title, input.author, input.date, input.message],
    );
    invalidate(["letters"]);
    return true;
  } catch (error) {
    console.error("[db] addLetter failed:", error);
    return false;
  }
}

export async function addGalleryItem(input: {
  sourceName: string;
  category: string;
  url: string;
  thumbnailUrl?: string | undefined;
  date?: string;
  kind?: "image" | "video";
}): Promise<{ ok: boolean; id?: string }> {
  const client = getPool();
  if (!client) return { ok: false };
  try {
    const id = `g-${sqlUuid()}`;
    await client.query(
      `INSERT INTO gallery_items (id, kind, source_name, category, date, url, thumbnail_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
      [
        id,
        input.kind || "image",
        input.sourceName.trim().slice(0, 160) || "Family photo",
        input.category.trim().slice(0, 120) || "General",
        input.date?.trim() || "",
        input.url,
        input.thumbnailUrl?.trim() || null,
      ],
    );
    invalidate(["gallery_items"]);
    return { ok: true, id };
  } catch (error) {
    console.error("[db] addGalleryItem failed:", error);
    return { ok: false };
  }
}

export async function deleteGalleryItemsByUrl(url: string): Promise<void> {
  const client = getPool();
  if (!client) return;
  try {
    await client.query(
      `DELETE FROM gallery_overrides
       WHERE id IN (SELECT id FROM gallery_items WHERE url = $1)`,
      [url],
    );
    await client.query(`DELETE FROM gallery_items WHERE url = $1`, [url]);
    invalidate(["gallery_items", "gallery_overrides"]);
  } catch (error) {
    console.error("[db] deleteGalleryItemsByUrl failed:", error);
  }
}

export async function deleteGalleryItem(id: string): Promise<{ ok: boolean }> {
  const client = getPool();
  if (!client) return { ok: false };
  try {
    await client.query(
      `INSERT INTO gallery_overrides (id, category, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, updated_at = now()`,
      [id, "__deleted_from_gallery__"],
    );
    await client.query(`DELETE FROM gallery_items WHERE id = $1`, [id]);
    invalidate(["gallery_items", "gallery_overrides"]);
    return { ok: true };
  } catch (error) {
    console.error("[db] deleteGalleryItem failed:", error);
    return { ok: false };
  }
}

export async function addMemory(input: {
  title: string;
  date: string;
  category: string;
  image: string;
  excerpt?: string;
  story?: string;
}): Promise<{ ok: boolean; id?: string }> {
  const client = getPool();
  if (!client) return { ok: false };
  try {
    const nextOrder = await query<{ next: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM memories`,
    );
    const sortOrder = nextOrder && nextOrder.length ? nextOrder[0]!.next : 1;
    const id = `mem-${sqlUuid()}`;
    await client.query(
      `INSERT INTO memories (id, title, date, category, image, excerpt, story, sort_order, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [
        id,
        input.title.trim().slice(0, 160),
        input.date.trim() || new Date().toISOString().slice(0, 10),
        input.category.trim() || "Milestones",
        input.image,
        input.excerpt?.trim() || "",
        input.story?.trim() || "",
        sortOrder,
      ],
    );
    invalidate(["memories"]);
    return { ok: true, id };
  } catch (error) {
    console.error("[db] addMemory failed:", error);
    return { ok: false };
  }
}

export async function updateGalleryItemCategory(
  id: string,
  category: string,
): Promise<{ ok: boolean }> {
  const client = getPool();
  if (!client) return { ok: false };
  try {
    const trimmedCat = category.trim();
    await client.query(
      `INSERT INTO gallery_overrides (id, category, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, updated_at = now()`,
      [id, trimmedCat],
    );
    await client.query(`UPDATE gallery_items SET category = $1 WHERE id = $2`, [trimmedCat, id]);
    invalidate(["gallery_items", "gallery_overrides"]);
    return { ok: true };
  } catch (error) {
    console.error("[db] updateGalleryItemCategory failed:", error);
    return { ok: false };
  }
}

async function updateField<T extends Record<string, unknown>>(
  table: string,
  id: string,
  patch: T,
): Promise<boolean> {
  const client = getPool();
  if (!client) return false;
  const sets: string[] = [];
  const values: unknown[] = [id];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    values.push(value);
    sets.push(`"${key}" = $${values.length}`);
  }
  if (!sets.length) return true;
  try {
    await client.query(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = $1`, values);
    invalidate([table]);
    return true;
  } catch (error) {
    console.error(`[db] update ${table} failed:`, error);
    return false;
  }
}
