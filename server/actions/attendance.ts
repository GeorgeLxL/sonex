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

/** "HH:MM" local clock time in the given timezone. */
function localClock(timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

const hhmm = (t: string) => t.slice(0, 5);

/** Late = checked in after work_start. Windows may cross midnight
 *  (e.g. 20:00 -> 16:00): then anything past start OR before end is late. */
function isLate(now: string, start: string, end: string): boolean {
  return start <= end ? now > start : now > start || now < end;
}

/** Check-out allowed once the local clock passes work_end.
 *  Overnight window: allowed in the gap between end and next start. */
function canCheckOut(now: string, start: string, end: string): boolean {
  return start <= end ? now >= end : now >= end && now < start;
}

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

  const now = localClock(auth.profile.timezone);
  const start = hhmm(auth.profile.work_start ?? "09:00");
  const end = hhmm(auth.profile.work_end ?? "18:00");
  const status = isLate(now, start, end) ? "late" : "present";

  const { error } = await db.from("attendance_logs").upsert(
    {
      user_id: auth.userId,
      work_date: today,
      check_in: new Date().toISOString(),
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
  const now = localClock(auth.profile.timezone);
  const start = hhmm(auth.profile.work_start ?? "09:00");
  const end = hhmm(auth.profile.work_end ?? "18:00");

  // Today's open row - or yesterday's, for shifts crossing midnight.
  let { data: row } = await db
    .from("attendance_logs")
    .select("id, work_date, check_in, check_out")
    .eq("user_id", auth.userId)
    .eq("work_date", today)
    .maybeSingle();
  if (!row?.check_in || row.check_out) {
    const { data: prev } = await db
      .from("attendance_logs")
      .select("id, work_date, check_in, check_out")
      .eq("user_id", auth.userId)
      .is("check_out", null)
      .not("check_in", "is", null)
      .order("work_date", { ascending: false })
      .limit(1);
    row = prev?.[0] ?? row;
  }
  if (!row?.check_in) return fail("Check in first");
  if (row.check_out) return fail("Already checked out today");

  let allowed = canCheckOut(now, start, end);

  // Approved early-leave for the shift date unlocks checkout earlier.
  if (!allowed) {
    const { data: early } = await db
      .from("leave_requests")
      .select("early_time")
      .eq("user_id", auth.userId)
      .eq("status", "approved")
      .eq("type", "early_leave")
      .lte("start_date", today)
      .gte("end_date", row.work_date)
      .not("early_time", "is", null)
      .limit(1);
    const earlyTime = early?.[0]?.early_time as string | undefined;
    if (earlyTime && now >= hhmm(earlyTime)) allowed = true;
  }

  if (!allowed) {
    return fail(
      `Too early to check out - your working hours end at ${end}. ` +
        `If you need to leave early, request an Early leave and get it approved.`,
    );
  }

  const { error } = await db
    .from("attendance_logs")
    .update({ check_out: new Date().toISOString() })
    .eq("id", row.id);
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

const leaveSchema = z
  .object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: z.enum(["vacation", "sick", "personal", "unpaid", "early_leave"]),
    early_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.end_date >= v.start_date, { message: "End date before start date" })
  .refine((v) => v.type !== "early_leave" || !!v.early_time, {
    message: "Early leave needs the time you plan to leave",
  });

export async function requestLeave(input: unknown): Promise<ActionResult> {
  const auth = await requireAuth();
  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();
  const isEarly = parsed.data.type === "early_leave";
  const { error } = await db.from("leave_requests").insert({
    ...parsed.data,
    // early leave is a single day, paid
    end_date: isEarly ? parsed.data.start_date : parsed.data.end_date,
    early_time: isEarly ? parsed.data.early_time : null,
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
