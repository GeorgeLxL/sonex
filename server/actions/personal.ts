"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { todayInTz } from "@/lib/dates";
import type { TaskStatus } from "@/types";
import type { ActionResult } from "@/server/actions/projects";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function revalidate() {
  revalidatePath("/workspace/personal");
  revalidatePath("/workspace");
}

const personalSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(300),
  description: z.string().trim().max(5000).nullable().default(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().default(null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  repeat_type: z
    .enum(["none", "daily", "weekly", "monthly", "workdays", "weekends", "custom"])
    .default("none"),
  repeat_interval: z.coerce.number().int().min(1).max(365).default(1),
  is_urgent: z.boolean().default(false),
  is_important: z.boolean().default(false),
});

export async function createPersonalTask(input: unknown): Promise<ActionResult> {
  const auth = await requireAuth();
  const parsed = personalSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const isRecurring = parsed.data.repeat_type !== "none";
  const today = todayInTz(auth.profile.timezone);
  // Recurring tasks always need a date so they appear in date views;
  // due_date is the end of recurrence (required for recurring).
  if (isRecurring && !parsed.data.due_date) {
    return fail("Recurring tasks need an end date (due date)");
  }

  const db = await supabaseServer();
  const { error } = await db.from("personal_tasks").insert({
    ...parsed.data,
    user_id: auth.userId,
    is_recurring: isRecurring,
    date: parsed.data.date ?? (isRecurring ? today : null),
  });
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

export async function updatePersonalTask(taskId: string, input: unknown): Promise<ActionResult> {
  await requireAuth();
  const parsed = personalSchema.partial().safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.repeat_type !== undefined) {
    patch.is_recurring = parsed.data.repeat_type !== "none";
  }
  const db = await supabaseServer();
  const { error } = await db.from("personal_tasks").update(patch).eq("id", taskId);
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

/**
 * Board move (ported todolist semantics):
 *  - non-recurring → done: fully complete
 *  - recurring → done: done for TODAY (occurrence logged); resets tomorrow
 *  - moving out of done clears completion
 */
export async function movePersonalTask(taskId: string, status: TaskStatus): Promise<ActionResult> {
  const auth = await requireAuth();
  const db = await supabaseServer();
  const today = todayInTz(auth.profile.timezone);

  const { data: task } = await db.from("personal_tasks").select("*").eq("id", taskId).single();
  if (!task) return fail("Not found");

  const patch: Record<string, unknown> = { status };
  if (status === "done") {
    if (task.is_recurring) {
      patch.is_done_today = true;
      patch.done_today_date = today;
      await db.from("personal_task_occurrences").upsert(
        { task_id: taskId, occurrence_date: today, is_done: true, done_at: new Date().toISOString() },
        { onConflict: "task_id,occurrence_date" },
      );
    } else {
      patch.is_fully_complete = true;
    }
  } else {
    patch.is_fully_complete = false;
    if (task.is_recurring && task.done_today_date === today) {
      patch.is_done_today = false;
      patch.done_today_date = null;
      await db
        .from("personal_task_occurrences")
        .delete()
        .eq("task_id", taskId)
        .eq("occurrence_date", today);
    }
  }

  const { error } = await db.from("personal_tasks").update(patch).eq("id", taskId);
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

export async function setPersonalTags(
  taskId: string,
  isUrgent: boolean,
  isImportant: boolean,
): Promise<ActionResult> {
  await requireAuth();
  const db = await supabaseServer();
  const { error } = await db
    .from("personal_tasks")
    .update({ is_urgent: isUrgent, is_important: isImportant })
    .eq("id", taskId);
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

export async function archivePersonalTask(taskId: string, archived: boolean): Promise<ActionResult> {
  await requireAuth();
  const db = await supabaseServer();
  const { error } = await db
    .from("personal_tasks")
    .update({
      is_archived: archived,
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

export async function deletePersonalTask(taskId: string): Promise<ActionResult> {
  await requireAuth();
  const db = await supabaseServer();
  const { error } = await db.from("personal_tasks").delete().eq("id", taskId);
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}
