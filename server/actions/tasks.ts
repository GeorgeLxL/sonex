"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can } from "@/lib/auth";
import type { TaskStatus } from "@/types";
import type { ActionResult } from "@/server/actions/projects";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function revalidateTask(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/workspace/projects/${projectId}`);
  revalidatePath("/workspace/tasks");
  revalidatePath("/workspace");
}

interface TaskAccess {
  userId: string;
  fullName: string;
  manage: boolean;
  member: boolean;
  ownerId: string;
}

async function taskAccess(projectId: string): Promise<TaskAccess | null> {
  const auth = await requireAuth();
  const db = await supabaseServer();
  const [{ data: project }, { data: membership }] = await Promise.all([
    db.from("projects").select("owner_id").eq("id", projectId).single(),
    db
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", auth.userId)
      .maybeSingle(),
  ]);
  if (!project) return null;
  const manage = project.owner_id === auth.userId || can(auth, "projects", "write");
  const member = !!membership;
  if (!manage && !member) return null;
  return {
    userId: auth.userId,
    fullName: auth.profile.full_name,
    manage,
    member,
    ownerId: project.owner_id,
  };
}

/* ---------------- create / edit ---------------- */

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(300),
  description: z.string().trim().max(5000).default(""),
  assignee_id: z.string().uuid().nullable().default(null),
  milestone_id: z.string().uuid().nullable().default(null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  is_urgent: z.boolean().default(false),
  is_important: z.boolean().default(false),
});

export async function createTask(projectId: string, input: unknown): Promise<ActionResult> {
  const access = await taskAccess(projectId);
  if (!access) return fail("Not allowed");
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();
  const { data, error } = await db
    .from("tasks")
    .insert({ ...parsed.data, project_id: projectId, created_by: access.userId })
    .select("id, title")
    .single();
  if (error) return fail(error.message);

  if (parsed.data.assignee_id && parsed.data.assignee_id !== access.userId) {
    await db.rpc("notify_user", {
      p_user: parsed.data.assignee_id,
      p_type: "task_assigned",
      p_title: "Task assigned to you",
      p_body: `"${data.title}"`,
      p_link: `/workspace/projects/${projectId}?task=${data.id}`,
    });
  }
  await db.rpc("log_activity", {
    p_project: projectId,
    p_task: data.id,
    p_action: "task_created",
    p_old: null,
    p_new: { title: data.title },
  });
  revalidateTask(projectId);
  return { ok: true, id: data.id };
}

export async function updateTask(
  taskId: string,
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  const access = await taskAccess(projectId);
  if (!access) return fail("Not allowed");
  const parsed = taskSchema.partial().safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();
  const before = await db.from("tasks").select("assignee_id, title").eq("id", taskId).single();
  const { error } = await db.from("tasks").update(parsed.data).eq("id", taskId);
  if (error) return fail(error.message);

  const newAssignee = parsed.data.assignee_id;
  if (newAssignee && newAssignee !== before.data?.assignee_id && newAssignee !== access.userId) {
    await db.rpc("notify_user", {
      p_user: newAssignee,
      p_type: "task_assigned",
      p_title: "Task assigned to you",
      p_body: `"${before.data?.title ?? "Task"}"`,
      p_link: `/workspace/projects/${projectId}?task=${taskId}`,
    });
  }
  revalidateTask(projectId);
  return { ok: true };
}

/* ---------------- board moves ---------------- */

export async function moveTask(
  taskId: string,
  projectId: string,
  status: TaskStatus,
  sortOrder: number,
): Promise<ActionResult> {
  const access = await taskAccess(projectId);
  if (!access) return fail("Not allowed");
  if (!Number.isFinite(sortOrder)) return fail("Invalid move");

  const db = await supabaseServer();
  const before = await db.from("tasks").select("status, title").eq("id", taskId).single();
  if (!before.data) return fail("Task not found");

  // Layer-2 Done gate (DB trigger is layer 3): staff finish at Review.
  if (!access.manage) {
    if (status === "done" && before.data.status !== "done") {
      return fail("Only the project owner can move a task to Done");
    }
    if (before.data.status === "done" && status !== "done") {
      return fail("Only the project owner can reopen a Done task");
    }
  }

  const { error } = await db
    .from("tasks")
    .update({ status, sort_order: sortOrder })
    .eq("id", taskId);
  if (error) return fail(error.message);

  if (before.data.status !== status) {
    await db.rpc("log_activity", {
      p_project: projectId,
      p_task: taskId,
      p_action: "task_moved",
      p_old: { status: before.data.status },
      p_new: { status },
    });
    // Staff pushed work to Review → the owner reviews it.
    if (status === "review" && access.userId !== access.ownerId) {
      await db.rpc("notify_user", {
        p_user: access.ownerId,
        p_type: "task_review",
        p_title: "Task ready for review",
        p_body: `${access.fullName} moved "${before.data.title}" to Review.`,
        p_link: `/workspace/projects/${projectId}?task=${taskId}`,
      });
    }
  }
  revalidateTask(projectId);
  return { ok: true };
}

export async function setTaskTags(
  taskId: string,
  projectId: string,
  isUrgent: boolean,
  isImportant: boolean,
): Promise<ActionResult> {
  const access = await taskAccess(projectId);
  if (!access) return fail("Not allowed");
  const db = await supabaseServer();
  const { error } = await db
    .from("tasks")
    .update({ is_urgent: isUrgent, is_important: isImportant })
    .eq("id", taskId);
  if (error) return fail(error.message);
  revalidateTask(projectId);
  return { ok: true };
}

/* ---------------- archive (= trash, menu only) ---------------- */

export async function archiveTask(
  taskId: string,
  projectId: string,
  archived: boolean,
): Promise<ActionResult> {
  const access = await taskAccess(projectId);
  if (!access?.manage) return fail("Only the project owner can archive tasks");
  const db = await supabaseServer();
  const { error } = await db
    .from("tasks")
    .update({ is_archived: archived, ...(archived ? {} : { archived_at: null }) })
    .eq("id", taskId);
  if (error) return fail(error.message);
  revalidateTask(projectId);
  return { ok: true };
}

export async function deleteTask(taskId: string, projectId: string): Promise<ActionResult> {
  const access = await taskAccess(projectId);
  if (!access?.manage) return fail("Not allowed");
  const db = await supabaseServer();
  const { error } = await db.from("tasks").delete().eq("id", taskId).eq("is_archived", true);
  if (error) return fail(error.message);
  revalidateTask(projectId);
  return { ok: true };
}

/* ---------------- comments ---------------- */

export async function addComment(
  taskId: string,
  projectId: string,
  body: string,
): Promise<ActionResult> {
  const access = await taskAccess(projectId);
  if (!access) return fail("Not allowed");
  const text = body.trim();
  if (!text || text.length > 5000) return fail("Comment must be 1–5000 characters");

  const db = await supabaseServer();
  const { data: task } = await db
    .from("tasks")
    .select("title, assignee_id")
    .eq("id", taskId)
    .single();
  const { error } = await db
    .from("task_comments")
    .insert({ task_id: taskId, user_id: access.userId, body: text });
  if (error) return fail(error.message);

  // Notify the assignee and the owner (excluding the commenter).
  const targets = new Set<string>();
  if (task?.assignee_id) targets.add(task.assignee_id);
  targets.add(access.ownerId);
  targets.delete(access.userId);
  for (const target of targets) {
    await db.rpc("notify_user", {
      p_user: target,
      p_type: "task_comment",
      p_title: "New comment",
      p_body: `${access.fullName} commented on "${task?.title ?? "a task"}".`,
      p_link: `/workspace/projects/${projectId}?task=${taskId}`,
    });
  }
  revalidateTask(projectId);
  return { ok: true };
}
