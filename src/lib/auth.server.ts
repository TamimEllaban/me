/* eslint-disable react-hooks/rules-of-hooks */
// useSession is a server context helper, not a React hook.
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

export type FamilySession = { unlocked?: boolean; profileId?: string };

export function getFamilySessionConfig() {
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

export function getFamilySession() {
  return useSession<FamilySession>(getFamilySessionConfig());
}

export async function requireUnlocked() {
  const session = await getFamilySession();
  if (!session.data.unlocked) throw redirect({ to: "/unlock" });
  return session;
}

export function getSuperAdminProfileIds(): string[] {
  return (process.env["SUPER_ADMIN_PROFILE_IDS"] ?? "baba")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminProfile(profileId: string | undefined): boolean {
  return Boolean(profileId && getSuperAdminProfileIds().includes(profileId.toLowerCase()));
}

export async function requireSuperAdmin() {
  const session = await requireUnlocked();
  if (!isSuperAdminProfile(session.data.profileId)) throw redirect({ to: "/" });
  return session;
}

export async function hasSuperAdminAccess(): Promise<boolean> {
  const session = await requireUnlocked();
  return isSuperAdminProfile(session.data.profileId);
}
