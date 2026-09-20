// Server-side access to family content.
//
// Prefers the Neon database when it is configured and reachable; otherwise
// falls back to the bundled placeholder content so the site always works.

import type { ChildRow, LetterRow, MemoryRow, ProfileRow, RelativeRow } from "./db";
import {
  loadChild as dbLoadChild,
  loadLetters as dbLoadLetters,
  loadMemories as dbLoadMemories,
  loadProfiles as dbLoadProfiles,
  loadRelatives as dbLoadRelatives,
} from "./db";
import {
  placeholderChild,
  placeholderLetters,
  placeholderMemories,
  placeholderProfiles,
  placeholderRelatives,
} from "./world-data.placeholder";

export type Child = Omit<ChildRow, "hero_image"> & { hero_image?: string | null };
export type Memory = Omit<MemoryRow, "sort_order"> & { story?: string };
export type Relative = Omit<RelativeRow, "sort_order">;
export type Letter = LetterRow;
export type Profile = ProfileRow;

export async function getChild(): Promise<Child> {
  return (await dbLoadChild()) ?? placeholderChild;
}

export async function getMemories(): Promise<Memory[]> {
  const rows = await dbLoadMemories();
  if (!rows.length) return placeholderMemories;
  return rows.map(({ sort_order: _sort_order, ...memory }) => memory);
}

export async function getRelatives(): Promise<Relative[]> {
  const rows = await dbLoadRelatives();
  if (!rows.length) return placeholderRelatives;
  return rows.map(({ sort_order: _sort_order, ...relative }) => relative);
}

export async function getLetters(): Promise<Letter[]> {
  const rows = await dbLoadLetters();
  if (!rows.length) return placeholderLetters;
  return rows;
}

export async function getProfiles(): Promise<Profile[]> {
  const rows = await dbLoadProfiles();
  if (!rows.length) return placeholderProfiles;
  return rows;
}
