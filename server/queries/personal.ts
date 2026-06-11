import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { todayInTz, addDays } from "@/lib/dates";
import type { PersonalTask } from "@/types";

/**
 * Load my personal tasks with the todolist app's lazy roll-forward:
 *  - recurring past end-of-recurrence → auto fully-complete
 *  - recurring: clear stale done-today, advance date to today
 *  - non-recurring undone with past date → surface today (due_date keeps overdue)
 *  - deadline today/tomorrow/past → auto-flag urgent (self-quiescing)
 */
export async function getMyPersonalTasks(timezone: string): Promise<PersonalTask[]> {
  const db = await supabaseServer();
  const { data } = await db
    .from("personal_tasks")
    .select("*")
    .order("created_at", { ascending: false });
  const tasks = (data ?? []) as PersonalTask[];

  const today = todayInTz(timezone);
  const tomorrow = addDays(today, 1);

  // 1. Recurrence reached its end → done.
  const expired = tasks.filter(
    (t) => t.is_recurring && !t.is_fully_complete && !!t.due_date && t.due_date < today,
  );
  for (const t of expired) {
    await db
      .from("personal_tasks")
      .update({ is_fully_complete: true, status: "done" })
      .eq("id", t.id);
    t.is_fully_complete = true;
    t.status = "done";
  }

  // 2. Roll recurring tasks forward to today.
  for (const t of tasks) {
    if (!t.is_recurring || t.is_fully_complete) continue;
    const patch: Record<string, unknown> = {};
    if (t.done_today_date && t.done_today_date < today) {
      patch.is_done_today = false;
      patch.done_today_date = null;
      patch.status = "todo";
    }
    if (!t.date || t.date < today) patch.date = today;
    if (Object.keys(patch).length === 0) continue;
    await db.from("personal_tasks").update(patch).eq("id", t.id);
    Object.assign(t, patch);
  }

  // 3. Roll non-recurring undone tasks forward.
  for (const t of tasks) {
    if (t.is_recurring || t.is_fully_complete) continue;
    const datePast = t.date && t.date < today;
    const duePast = t.due_date && t.due_date < today;
    if ((!datePast && !duePast) || t.date === today) continue;
    await db.from("personal_tasks").update({ date: today }).eq("id", t.id);
    t.date = today;
  }

  // 4. Auto-urgent near deadline (self-quiescing).
  for (const t of tasks) {
    if (t.is_urgent || t.is_fully_complete) continue;
    const deadline = t.is_recurring ? t.due_date : (t.due_date ?? t.date);
    if (deadline && deadline <= tomorrow) {
      await db.from("personal_tasks").update({ is_urgent: true }).eq("id", t.id);
      t.is_urgent = true;
    }
  }

  return tasks;
}
