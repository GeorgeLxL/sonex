"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can } from "@/lib/auth";
import type { ProjectStatus } from "@/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function canManageProject(projectId: string): Promise<boolean> {
  const auth = await requireAuth();
  if (can(auth, "projects", "write")) return true;
  const db = await supabaseServer();
  const { data } = await db.from("projects").select("owner_id").eq("id", projectId).single();
  return data?.owner_id === auth.userId;
}

function revalidateProjects(projectId?: string) {
  revalidatePath("/admin/projects");
  revalidatePath("/workspace/projects");
  revalidatePath("/workspace");
  revalidatePath("/admin");
  if (projectId) {
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/workspace/projects/${projectId}`);
  }
}

/* ---------------- projects ---------------- */

const projectSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  description: z.string().trim().max(5000).default(""),
  client_id: z.string().uuid().nullable().default(null),
  owner_id: z.string().uuid(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  amount: z.coerce.number().min(0).default(0),
});

export async function createProject(input: unknown): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "projects", "write")) return fail("No permission to create projects");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();
  const { data, error } = await db
    .from("projects")
    .insert({ ...parsed.data, created_by: auth.userId })
    .select("id, name")
    .single();
  if (error) return fail(error.message);

  if (parsed.data.owner_id !== auth.userId) {
    await db.rpc("notify_user", {
      p_user: parsed.data.owner_id,
      p_type: "project_assigned",
      p_title: "You own a new project",
      p_body: `${auth.profile.full_name} made you the owner of "${data.name}".`,
      p_link: `/workspace/projects/${data.id}`,
    });
  }
  await db.rpc("log_activity", {
    p_project: data.id,
    p_task: null,
    p_action: "project_created",
    p_old: null,
    p_new: { name: data.name },
  });
  revalidateProjects(data.id);
  return { ok: true, id: data.id };
}

const projectPatchSchema = projectSchema.partial();

export async function updateProject(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAuth();
  const parsed = projectPatchSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  if (!(await canManageProject(projectId))) return fail("Not allowed");

  const db = await supabaseServer();

  // Owner change is CTO/COO-level (the DB trigger also enforces this).
  if (parsed.data.owner_id && !can(auth, "projects", "write")) {
    return fail("Only project managers can change the owner");
  }

  const before = await db.from("projects").select("owner_id, name").eq("id", projectId).single();
  const { error } = await db.from("projects").update(parsed.data).eq("id", projectId);
  if (error) return fail(error.message);

  if (
    parsed.data.owner_id &&
    before.data &&
    parsed.data.owner_id !== before.data.owner_id &&
    parsed.data.owner_id !== auth.userId
  ) {
    await db.rpc("notify_user", {
      p_user: parsed.data.owner_id,
      p_type: "project_assigned",
      p_title: "You own a new project",
      p_body: `${auth.profile.full_name} made you the owner of "${before.data.name}".`,
      p_link: `/workspace/projects/${projectId}`,
    });
  }
  revalidateProjects(projectId);
  return { ok: true };
}

const moveSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done", "paid"]),
  sort_order: z.number().finite(),
});

export async function moveProject(
  projectId: string,
  status: ProjectStatus,
  sortOrder: number,
): Promise<ActionResult> {
  const auth = await requireAuth();
  const parsed = moveSchema.safeParse({ status, sort_order: sortOrder });
  if (!parsed.success) return fail("Invalid move");
  if (!(await canManageProject(projectId))) return fail("Not allowed");

  const db = await supabaseServer();
  const before = await db.from("projects").select("status").eq("id", projectId).single();

  // Layer-2 Paid gate (the DB trigger is layer 3).
  const togglesPaid =
    (parsed.data.status === "paid") !== (before.data?.status === "paid");
  if (togglesPaid && !can(auth, "projects.mark_paid", "write")) {
    return fail("Only CTO/COO can move a project to or from Paid");
  }

  const { error } = await db
    .from("projects")
    .update({ status: parsed.data.status, sort_order: parsed.data.sort_order })
    .eq("id", projectId);
  if (error) return fail(error.message);

  if (before.data && before.data.status !== parsed.data.status) {
    await db.rpc("log_activity", {
      p_project: projectId,
      p_task: null,
      p_action: "project_moved",
      p_old: { status: before.data.status },
      p_new: { status: parsed.data.status },
    });
  }
  revalidateProjects(projectId);
  return { ok: true };
}

export async function archiveProject(projectId: string, archived: boolean): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "projects", "write")) return fail("Only project managers can archive projects");
  const db = await supabaseServer();
  const { error } = await db
    .from("projects")
    .update({ is_archived: archived, ...(archived ? {} : { archived_at: null }) })
    .eq("id", projectId);
  if (error) return fail(error.message);
  revalidateProjects(projectId);
  return { ok: true };
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "projects", "write")) return fail("Not allowed");
  const db = await supabaseServer();
  const { error } = await db.from("projects").delete().eq("id", projectId).eq("is_archived", true);
  if (error) return fail(error.message);
  revalidateProjects();
  return { ok: true };
}

/* ---------------- members ---------------- */

export async function addMember(projectId: string, userId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!(await canManageProject(projectId))) return fail("Only the owner can add members");

  const db = await supabaseServer();
  const { data: project } = await db.from("projects").select("name").eq("id", projectId).single();
  const { error } = await db
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId, added_by: auth.userId });
  if (error) {
    return fail(error.code === "23505" ? "Already a member" : error.message);
  }

  await db.rpc("notify_user", {
    p_user: userId,
    p_type: "project_member_added",
    p_title: "Added to a project",
    p_body: `${auth.profile.full_name} added you to "${project?.name ?? "a project"}".`,
    p_link: `/workspace/projects/${projectId}`,
  });
  await db.rpc("log_activity", {
    p_project: projectId,
    p_task: null,
    p_action: "member_added",
    p_old: null,
    p_new: { user_id: userId },
  });
  revalidateProjects(projectId);
  return { ok: true };
}

export async function removeMember(projectId: string, userId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!(await canManageProject(projectId))) return fail("Only the owner can remove members");

  const db = await supabaseServer();
  const { data: project } = await db.from("projects").select("name").eq("id", projectId).single();

  const { error } = await db
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) return fail(error.message);

  // Unassign (never delete) their tasks in this project.
  await db
    .from("tasks")
    .update({ assignee_id: null })
    .eq("project_id", projectId)
    .eq("assignee_id", userId);

  await db.rpc("notify_user", {
    p_user: userId,
    p_type: "project_member_removed",
    p_title: "Removed from a project",
    p_body: `You were removed from "${project?.name ?? "a project"}".`,
    p_link: "/workspace/projects",
  });
  revalidateProjects(projectId);
  return { ok: true };
}

/* ---------------- milestones ---------------- */

const milestoneSchema = z.object({
  title: z.string().trim().min(1).max(200),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  amount: z.coerce.number().min(0).default(0),
});

export async function createMilestone(projectId: string, input: unknown): Promise<ActionResult> {
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  if (!(await canManageProject(projectId))) return fail("Not allowed");
  const db = await supabaseServer();
  const { error } = await db
    .from("project_milestones")
    .insert({ ...parsed.data, project_id: projectId });
  if (error) return fail(error.message);
  revalidateProjects(projectId);
  return { ok: true };
}

export async function updateMilestone(
  milestoneId: string,
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = milestoneSchema.partial().safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  if (!(await canManageProject(projectId))) return fail("Not allowed");
  const db = await supabaseServer();
  const { error } = await db.from("project_milestones").update(parsed.data).eq("id", milestoneId);
  if (error) return fail(error.message);
  revalidateProjects(projectId);
  return { ok: true };
}

export async function moveMilestone(
  milestoneId: string,
  projectId: string,
  status: ProjectStatus,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!(await canManageProject(projectId))) return fail("Not allowed");

  const db = await supabaseServer();
  const before = await db
    .from("project_milestones")
    .select("status")
    .eq("id", milestoneId)
    .single();
  const togglesPaid = (status === "paid") !== (before.data?.status === "paid");
  if (togglesPaid && !can(auth, "projects.mark_paid", "write")) {
    return fail("Only CTO/COO can mark a milestone Paid");
  }

  const { error } = await db
    .from("project_milestones")
    .update({ status })
    .eq("id", milestoneId);
  if (error) return fail(error.message);
  revalidateProjects(projectId);
  return { ok: true };
}

export async function deleteMilestone(milestoneId: string, projectId: string): Promise<ActionResult> {
  if (!(await canManageProject(projectId))) return fail("Not allowed");
  const db = await supabaseServer();
  const { error } = await db.from("project_milestones").delete().eq("id", milestoneId);
  if (error) return fail(error.message);
  revalidateProjects(projectId);
  return { ok: true };
}
