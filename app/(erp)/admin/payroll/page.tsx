import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm } from "@/lib/auth";
import { todayInTz } from "@/lib/dates";
import { PageTitle } from "@/components/ui";
import {
  PayrollManager,
  type SalaryRecordRow,
  type BaseSalaryRow,
} from "@/components/admin/payroll-manager";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const auth = await requirePerm("payroll", "read");
  const { month: rawMonth } = await searchParams;
  const month =
    rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)
      ? rawMonth
      : todayInTz(auth.profile.timezone).slice(0, 7);
  const monthStart = `${month}-01`;

  const db = await supabaseServer();
  const [recordsRes, salariesRes, staffRes] = await Promise.all([
    db
      .from("salary_records")
      .select(
        "*, profiles!salary_records_user_id_fkey(full_name), salary_adjustments(id, amount, reason)",
      )
      .eq("month", monthStart),
    db
      .from("staff_salaries")
      .select("*, profiles!staff_salaries_user_id_fkey(full_name)")
      .order("effective_from", { ascending: false }),
    db.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  const records: SalaryRecordRow[] = (recordsRes.data ?? [])
    .map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: (r.profiles as { full_name: string } | null)?.full_name ?? "Unknown",
      month: r.month,
      base: Number(r.base),
      bonus: Number(r.bonus),
      deductions: Number(r.deductions),
      absence_deduction: Number(r.absence_deduction),
      total: Number(r.total),
      status: r.status,
      note: r.note,
      adjustments: ((r.salary_adjustments ?? []) as { id: string; amount: number; reason: string }[]).map(
        (a) => ({ ...a, amount: Number(a.amount) }),
      ),
    }))
    .sort((a, b) => a.user_name.localeCompare(b.user_name));

  // Latest base per user for display.
  const seen = new Set<string>();
  const baseSalaries: BaseSalaryRow[] = [];
  for (const s of salariesRes.data ?? []) {
    if (seen.has(s.user_id)) continue;
    seen.add(s.user_id);
    baseSalaries.push({
      id: s.id,
      user_id: s.user_id,
      user_name: (s.profiles as { full_name: string } | null)?.full_name ?? "Unknown",
      base_salary: Number(s.base_salary),
      effective_from: s.effective_from,
    });
  }
  baseSalaries.sort((a, b) => a.user_name.localeCompare(b.user_name));

  return (
    <div>
      <PageTitle
        title="Payroll"
        sub="Draft → review/adjust → confirm → mark paid (real payment happens outside the system)."
      />
      <PayrollManager
        month={month}
        records={records}
        baseSalaries={baseSalaries}
        staff={staffRes.data ?? []}
      />
    </div>
  );
}
