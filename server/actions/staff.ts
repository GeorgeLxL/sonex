"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth, can } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/projects";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

const staffPatchSchema = z.object({
  full_name: z.string().trim().min(1).max(200).optional(),
  role_id: z.string().uuid().optional(),
  department_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  work_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  work_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function updateStaff(userId: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "staff", "write")) return fail("No permission to manage staff");
  const parsed = staffPatchSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();

  // Role escalation guards: only COO touches COO accounts or assigns COO.
  if (parsed.data.role_id) {
    const { data: newRole } = await db.from("roles").select("name").eq("id", parsed.data.role_id).single();
    if (newRole?.name === "coo" && auth.role !== "coo") return fail("Only the COO can assign the COO role");
  }
  const { data: target } = await db
    .from("profiles")
    .select("role_id, is_active, email, full_name, joined_at, roles(name)")
    .eq("id", userId)
    .single();
  const targetRole = (target?.roles as unknown as { name: string } | null)?.name;
  if (targetRole === "coo" && auth.role !== "coo") return fail("Only the COO can modify COO accounts");
  if (userId === auth.userId && parsed.data.is_active === false) return fail("You cannot deactivate yourself");

  const approving = parsed.data.is_active === true && target?.is_active === false;
  const patch: Record<string, unknown> = { ...parsed.data };
  if (approving && !target?.joined_at) {
    patch.joined_at = new Date().toISOString().slice(0, 10);
  }

  const { error } = await db.from("profiles").update(patch).eq("id", userId);
  if (error) return fail(error.message);

  // Approval of a self-registered account → in-app welcome notification.
  if (approving && target) {
    await db.rpc("notify_user", {
      p_user: userId,
      p_type: "account_approved",
      p_title: "Account approved",
      p_body: "Welcome aboard — your account is now active.",
      p_link: "/workspace",
    });
  }
  revalidatePath("/admin/staff");
  return { ok: true };
}

/** Permanently delete a staff account (auth user + profile cascade).
 *  Prefer deactivation; deletion is for mistakes/spam registrations. */
export async function deleteStaff(userId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "staff", "write")) return fail("No permission to manage staff");
  if (userId === auth.userId) return fail("You cannot delete yourself");

  const db = await supabaseServer();
  const { data: target } = await db
    .from("profiles")
    .select("full_name, roles(name)")
    .eq("id", userId)
    .single();
  if (!target) return fail("Account not found");
  if ((target.roles as unknown as { name: string } | null)?.name === "coo" && auth.role !== "coo") {
    return fail("Only the COO can delete a COO account");
  }

  // Owned projects block deletion - reassign owners first.
  const { count } = await db
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if ((count ?? 0) > 0) {
    return fail(`${target.full_name} owns ${count} project(s) - reassign the owner first`);
  }

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return fail(
      /foreign key|violates/i.test(error.message)
        ? "This account still has linked records - deactivate it instead"
        : error.message,
    );
  }
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function resetStaffPassword(userId: string, password: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "staff", "write")) return fail("No permission");
  if (password.length < 8) return fail("Password must be 8+ characters");

  const db = await supabaseServer();
  const { data: target } = await db
    .from("profiles")
    .select("roles(name)")
    .eq("id", userId)
    .single();
  if ((target?.roles as unknown as { name: string } | null)?.name === "coo" && auth.role !== "coo") {
    return fail("Only the COO can reset a COO password");
  }

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return fail(error.message);
  return { ok: true };
}
