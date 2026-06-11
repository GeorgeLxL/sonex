"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can } from "@/lib/auth";
import { addDays, workdaysBetween } from "@/lib/dates";
import type { ActionResult } from "@/server/actions/projects";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function revalidate() {
  revalidatePath("/admin/payroll");
  revalidatePath("/workspace/payslips");
}

async function requirePayroll() {
  const auth = await requireAuth();
  if (!can(auth, "payroll", "write")) return null;
  return auth;
}

function monthRange(month: string): { start: string; end: string } {
  const start = month.slice(0, 7) + "-01";
  const d = new Date(start + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  d.setDate(0); // last day of `month`
  const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start, end };
}

const salarySchema = z.object({
  user_id: z.string().uuid(),
  base_salary: z.coerce.number().min(0),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function setBaseSalary(input: unknown): Promise<ActionResult> {
  const auth = await requirePayroll();
  if (!auth) return fail("No payroll permission");
  const parsed = salarySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();
  const { error } = await db
    .from("staff_salaries")
    .upsert({ ...parsed.data, created_by: auth.userId }, { onConflict: "user_id,effective_from" });
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}

/**
 * Generate DRAFT salary records for every active staff member for a month.
 *   salary = base − unpaid absence (unpaid approved leave + absent days)
 * Daily rate = base / workdays in the month. Existing records are kept —
 * confirmed payslips are historical documents and are never recomputed.
 */
export async function generateDrafts(month: string): Promise<ActionResult> {
  const auth = await requirePayroll();
  if (!auth) return fail("No payroll permission");
  if (!/^\d{4}-\d{2}$/.test(month) && !/^\d{4}-\d{2}-\d{2}$/.test(month)) return fail("Invalid month");

  const { start, end } = monthRange(month);
  const db = await supabaseServer();

  const [staffRes, salariesRes, existingRes, leavesRes, absentRes] = await Promise.all([
    db.from("profiles").select("id, full_name").eq("is_active", true),
    db.from("staff_salaries").select("user_id, base_salary, effective_from").lte("effective_from", end),
    db.from("salary_records").select("user_id").eq("month", start),
    db
      .from("leave_requests")
      .select("user_id, start_date, end_date, is_paid")
      .eq("status", "approved")
      .eq("is_paid", false)
      .lte("start_date", end)
      .gte("end_date", start),
    db
      .from("attendance_logs")
      .select("user_id")
      .eq("status", "absent")
      .gte("work_date", start)
      .lte("work_date", end),
  ]);

  const existing = new Set((existingRes.data ?? []).map((r) => r.user_id));
  const monthWorkdays = Math.max(workdaysBetween(start, end), 1);

  // Latest base salary effective on/before month end, per user.
  const baseByUser = new Map<string, number>();
  for (const s of (salariesRes.data ?? []).sort((a, b) =>
    a.effective_from.localeCompare(b.effective_from),
  )) {
    baseByUser.set(s.user_id, Number(s.base_salary));
  }

  const unpaidDays = new Map<string, number>();
  for (const l of leavesRes.data ?? []) {
    const from = l.start_date < start ? start : l.start_date;
    const to = l.end_date > end ? end : l.end_date;
    unpaidDays.set(l.user_id, (unpaidDays.get(l.user_id) ?? 0) + workdaysBetween(from, to));
  }
  for (const a of absentRes.data ?? []) {
    unpaidDays.set(a.user_id, (unpaidDays.get(a.user_id) ?? 0) + 1);
  }

  let created = 0;
  let skippedNoSalary = 0;
  for (const staff of staffRes.data ?? []) {
    if (existing.has(staff.id)) continue;
    const base = baseByUser.get(staff.id);
    if (base == null) {
      skippedNoSalary++;
      continue;
    }
    const days = Math.min(unpaidDays.get(staff.id) ?? 0, monthWorkdays);
    const absence = Math.round((base / monthWorkdays) * days * 100) / 100;
    const total = Math.round((base - absence) * 100) / 100;
    const { error } = await db.from("salary_records").insert({
      user_id: staff.id,
      month: start,
      base,
      absence_deduction: absence,
      total,
      status: "draft",
    });
    if (!error) created++;
  }

  revalidate();
  return {
    ok: true,
    error:
      skippedNoSalary > 0
        ? `${created} draft(s) created. ${skippedNoSalary} staff skipped — no base salary set.`
        : `${created} draft(s) created.`,
  };
}

async function recomputeRecord(recordId: string): Promise<string | null> {
  const db = await supabaseServer();
  const [{ data: record }, { data: adjustments }] = await Promise.all([
    db.from("salary_records").select("base, absence_deduction").eq("id", recordId).single(),
    db.from("salary_adjustments").select("amount").eq("salary_record_id", recordId),
  ]);
  if (!record) return "Record not found";
  let bonus = 0;
  let deductions = 0;
  for (const a of adjustments ?? []) {
    const v = Number(a.amount);
    if (v >= 0) bonus += v;
    else deductions += -v;
  }
  const total =
    Math.round((Number(record.base) + bonus - deductions - Number(record.absence_deduction)) * 100) / 100;
  const { error } = await db
    .from("salary_records")
    .update({ bonus, deductions, total })
    .eq("id", recordId);
  return error?.message ?? null;
}

const adjustmentSchema = z.object({
  amount: z.coerce.number().refine((v) => v !== 0, "Amount cannot be zero"),
  reason: z.string().trim().min(1, "Reason required").max(500),
});

export async function addAdjustment(recordId: string, input: unknown): Promise<ActionResult> {
  const auth = await requirePayroll();
  if (!auth) return fail("No payroll permission");
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();
  const { data: record } = await db
    .from("salary_records")
    .select("status")
    .eq("id", recordId)
    .single();
  if (!record) return fail("Record not found");
  if (record.status === "paid") return fail("Record already paid — cannot adjust");

  const { error } = await db.from("salary_adjustments").insert({
    salary_record_id: recordId,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    added_by: auth.userId,
  });
  if (error) return fail(error.message);
  const recomputeError = await recomputeRecord(recordId);
  if (recomputeError) return fail(recomputeError);
  revalidate();
  return { ok: true };
}

export async function setRecordStatus(
  recordId: string,
  status: "draft" | "confirmed" | "paid",
): Promise<ActionResult> {
  const auth = await requirePayroll();
  if (!auth) return fail("No payroll permission");

  const db = await supabaseServer();
  const { data: record } = await db
    .from("salary_records")
    .select("user_id, status, month, total")
    .eq("id", recordId)
    .single();
  if (!record) return fail("Record not found");

  const patch: Record<string, unknown> = { status };
  if (status === "confirmed") {
    patch.confirmed_by = auth.userId;
    patch.confirmed_at = new Date().toISOString();
  }
  if (status === "paid") patch.paid_at = new Date().toISOString();

  const { error } = await db.from("salary_records").update(patch).eq("id", recordId);
  if (error) return fail(error.message);

  if (status === "confirmed" || status === "paid") {
    await db.rpc("notify_user", {
      p_user: record.user_id,
      p_type: "payslip",
      p_title: status === "paid" ? "Salary paid" : "Payslip ready",
      p_body: `Your ${record.month.slice(0, 7)} payslip is ${status}.`,
      p_link: "/workspace/payslips",
    });
  }
  revalidate();
  return { ok: true };
}

export async function deleteDraft(recordId: string): Promise<ActionResult> {
  const auth = await requirePayroll();
  if (!auth) return fail("No payroll permission");
  const db = await supabaseServer();
  const { error } = await db
    .from("salary_records")
    .delete()
    .eq("id", recordId)
    .eq("status", "draft");
  if (error) return fail(error.message);
  revalidate();
  return { ok: true };
}
