// Thin Postgres (Neon) data layer.
//
// Every loader returns `null` when the database is not configured or
// unreachable, so callers can fall back to bundled placeholder content.
// Results are cached briefly per server process to keep page renders snappy.

import { Pool } from "@neondatabase/serverless";

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
};
export type LetterRow = {
  id: string;
  title: string;
  author: string;
  date: string;
  message: string;
};
export type ProfileRow = { id: string; name: string; initials: string };

const CHILD_SQL = `SELECT name, birthdate::text AS birthdate, welcome, hero_image FROM child WHERE id = 1 LIMIT 1`;
const MEMORIES_SQL = `SELECT id, title, date, category, image, excerpt, story, sort_order FROM memories ORDER BY sort_order ASC`;
const RELATIVES_SQL = `SELECT id, name, relationship, "group", image, fact, bio, sort_order FROM relatives ORDER BY sort_order ASC`;
const LETTERS_SQL = `SELECT id, title, author, date, message FROM letters ORDER BY created_at ASC, id ASC`;
const PROFILES_SQL = `SELECT id, name, initials FROM profiles ORDER BY created_at ASC, id ASC`;

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
    sets.push(`${key} = $${values.length}`);
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
  patch: Partial<Pick<RelativeRow, "name" | "relationship" | "group" | "image" | "fact" | "bio">>,
): Promise<boolean> {
  return updateField("relatives", id, patch);
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
    sets.push(`${key} = $${values.length}`);
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
