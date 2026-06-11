"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/projects";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function requirePermAdmin() {
  const auth = await requireAuth();
  if (!can(auth, "permissions", "write")) return null;
  return auth;
}

export async function setRolePerm(
  roleId: string,
  code: string,
  level: "read" | "write" | null,
): Promise<ActionResult> {
  const auth = await requirePermAdmin();
  if (!auth) return fail("Only permission managers can do this");

  const db = await supabaseServer();
  const { data: role } = await db.from("roles").select("name").eq("id", roleId).single();
  if (!role) return fail("Unknown role");
  if (role.name === "coo") return fail("COO always has full access");

  const { error } = level
    ? await db.from("role_permissions").upsert({ role_id: roleId, code, level })
    : await db.from("role_permissions").delete().eq("role_id", roleId).eq("code", code);
  if (error) return fail(error.message);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function setUserPerm(
  userId: string,
  code: string,
  level: "none" | "read" | "write" | null, // null = inherit from role
): Promise<ActionResult> {
  const auth = await requirePermAdmin();
  if (!auth) return fail("Only permission managers can do this");

  const db = await supabaseServer();
  const { data: target } = await db
    .from("profiles")
    .select("roles(name)")
    .eq("id", userId)
    .single();
  if ((target?.roles as unknown as { name: string } | null)?.name === "coo") {
    return fail("COO always has full access");
  }

  const { error } = level
    ? await db.from("user_permissions").upsert({ user_id: userId, code, level })
    : await db.from("user_permissions").delete().eq("user_id", userId).eq("code", code);
  if (error) return fail(error.message);
  revalidatePath("/admin/settings");
  return { ok: true };
}

const roleSchema = z.object({
  display_name: z.string().trim().min(1, "Name required").max(100),
});

export async function createRole(input: unknown): Promise<ActionResult> {
  const auth = await requirePermAdmin();
  if (!auth) return fail("Only permission managers can do this");
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const name = parsed.data.display_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!name) return fail("Invalid role name");
  if (["coo", "ceo", "staff"].includes(name)) return fail("Reserved role name");

  const db = await supabaseServer();
  const { error } = await db
    .from("roles")
    .insert({ name, display_name: parsed.data.display_name });
  if (error) return fail(error.code === "23505" ? "Role already exists" : error.message);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  const auth = await requirePermAdmin();
  if (!auth) return fail("Only permission managers can do this");

  const db = await supabaseServer();
  const { data: role } = await db
    .from("roles")
    .select("name, is_system")
    .eq("id", roleId)
    .single();
  if (!role) return fail("Role not found");
  if (role.is_system) return fail("System roles (COO, CEO, Staff, ...) cannot be deleted");

  // Block deletion while staff are still assigned the role.
  const { count } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);
  if ((count ?? 0) > 0) {
    return fail(`${count} staff member(s) still have this role - reassign them first`);
  }

  // role_permissions cascade-delete via FK; user_permissions are per-user.
  const { error } = await db.from("roles").delete().eq("id", roleId);
  if (error) return fail(error.message);
  revalidatePath("/admin/settings");
  return { ok: true };
}
