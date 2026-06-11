import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { PermLevel, Profile } from "@/types";

export interface AuthContext {
  userId: string;
  profile: Profile;
  role: string; // role slug: 'coo' | 'ceo' | 'cto' | 'hr' | 'finance' | 'pm' | 'staff' | custom
  roleDisplay: string;
  /** Resolved permissions: role defaults with per-user overrides applied. */
  perms: Record<string, PermLevel>;
}

const RANK: Record<PermLevel, number> = { none: 0, read: 1, write: 2 };

/** Layer-2 check (server). Mirrors the SQL has_perm(): COO bypasses. */
export function can(
  auth: AuthContext,
  code: string,
  level: "read" | "write" = "read",
): boolean {
  if (auth.role === "coo") return true;
  return RANK[auth.perms[code] ?? "none"] >= RANK[level];
}

/** True if the user belongs in the /admin area at all. */
export function isAdminish(auth: AuthContext): boolean {
  if (auth.role === "coo") return true;
  return Object.values(auth.perms).some((l) => l !== "none");
}

export function homeFor(auth: AuthContext): string {
  if (auth.role === "ceo") return "/ceo";
  if (auth.role === "coo" || isAdminish(auth)) return "/admin";
  return "/workspace";
}

/** Per-request cached auth context (null when not logged in). */
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("*, roles(name, display_name)")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.is_active) return null;

  const [{ data: rolePerms }, { data: userPerms }] = await Promise.all([
    db.from("role_permissions").select("code, level").eq("role_id", profile.role_id),
    db.from("user_permissions").select("code, level").eq("user_id", user.id),
  ]);

  const perms: Record<string, PermLevel> = {};
  for (const p of rolePerms ?? []) perms[p.code] = p.level as PermLevel;
  for (const p of userPerms ?? []) perms[p.code] = p.level as PermLevel; // user override wins

  const role = (profile.roles as unknown as { name: string; display_name: string }) ?? {
    name: "staff",
    display_name: "Staff",
  };

  return {
    userId: user.id,
    profile: profile as unknown as Profile,
    role: role.name,
    roleDisplay: role.display_name,
    perms,
  };
});

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  return auth;
}

export async function requirePerm(
  code: string,
  level: "read" | "write" = "read",
): Promise<AuthContext> {
  const auth = await requireAuth();
  if (!can(auth, code, level)) redirect(homeFor(auth));
  return auth;
}
