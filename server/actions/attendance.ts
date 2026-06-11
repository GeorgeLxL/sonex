"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can } from "@/lib/auth";
import { todayInTz } from "@/lib/dates";
import type { ActionResult } from "@/server/actions/projects";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function revalidate() {
  revalidatePath("/workspace/attendance");
  revalidatePath("/admin/attendance");
  revalidatePath("/workspace");
}

/** Work starts at 10:00 local — later check-in is flagged "late". */
const WORKDAY_START = "10:00";

export async function checkIn(): Promise<ActionResult> {
  const auth = await requireAuth();
  const db = await supabaseServer();
  const today = todayInTz(auth.profile.timezone);

  const { data: existing } = await db
    .from("attendance_logs")
    .select("id, check_in")
    .eq("user_id", auth.userId)
    .eq("work_date", today)
    .maybeSingle();
  if (existing?.check_in) return fail("Already checked in today");

  const now = new Date();
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: auth.profile.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const status = localTime > WORKDAY_START ? "late" : "present";

  const { error } = await db.from("attendance_logs").upsert(
    {
      user_id: auth.userId,
      work_date: today,
      check_in: now.toISOString(),
      status,
    },
    { onConflict: "user_id,work_date" },
  );
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

export async function checkOut(): Promise<ActionResult> {
  const auth = await requireAuth();
  const db = await supabaseServer();
  const today = todayInTz(auth.profile.timezone);

  const { data: existing } = await db
    .from("attendance_logs")
    .select("id, check_in, check_out")
    .eq("user_id", auth.userId)
    .eq("work_date", today)
    .maybeSingle();
  if (!existing?.check_in) return fail("Check in first");
  if (existing.check_out) return fail("Already checked out today");

  const { error } = await db
    .from("attendance_logs")
    .update({ check_out: new Date().toISOString() })
    .eq("id", existing.id);
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

const leaveSchema = z
  .object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: z.enum(["vacation", "sick", "personal", "unpaid"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.end_date >= v.start_date, { message: "End date before start date" });

export async function requestLeave(input: unknown): Promise<ActionResult> {
  const auth = await requireAuth();
  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();
  const { error } = await db.from("leave_requests").insert({
    ...parsed.data,
    user_id: auth.userId,
    is_paid: parsed.data.type !== "unpaid",
  });
  if (error) return fail(error.message);

  // Notify everyone who can approve (attendance.write holders + COO).
  const { data: approvers } = await db
    .from("profiles")
    .select("id, roles!inner(name)")
    .eq("is_active", true)
    .in("roles.name", ["coo", "hr"]);
  for (const a of approvers ?? []) {
    if (a.id === auth.userId) continue;
    await db.rpc("notify_user", {
      p_user: a.id,
      p_type: "leave_requested",
      p_title: "Leave request",
      p_body: `${auth.profile.full_name}: ${parsed.data.start_date} → ${parsed.data.end_date} (${parsed.data.type})`,
      p_link: "/admin/attendance",
    });
  }
  revalidate();
  return { ok: true };
}

export async function cancelLeave(leaveId: string): Promise<ActionResult> {
  await requireAuth();
  const db = await supabaseServer();
  const { error } = await db
    .from("leave_requests")
    .delete()
    .eq("id", leaveId)
    .eq("status", "pending");
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

export async function reviewLeave(
  leaveId: string,
  approve: boolean,
  note?: string,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "attendance", "write")) return fail("No permission to review leave");

  const db = await supabaseServer();
  const { data: leave } = await db
    .from("leave_requests")
    .select("user_id, start_date, end_date")
    .eq("id", leaveId)
    .single();
  if (!leave) return fail("Not found");

  const { error } = await db
    .from("leave_requests")
    .update({
      status: approve ? "approved" : "rejected",
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      review_note: note ?? null,
    })
    .eq("id", leaveId);
  if (error) return fail(error.message);

  await db.rpc("notify_user", {
    p_user: leave.user_id,
    p_type: "leave_reviewed",
    p_title: approve ? "Leave approved" : "Leave rejected",
    p_body: `${leave.start_date} → ${leave.end_date}${note ? ` — ${note}` : ""}`,
    p_link: "/workspace/attendance",
  });
  revalidate();
  return { ok: true };
}
