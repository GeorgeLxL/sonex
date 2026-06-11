import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { PageTitle, Badge, Empty, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "My payslips" };

export default async function PayslipsPage() {
  const auth = await requireAuth();
  const db = await supabaseServer();

  const [recordsRes, salaryRes] = await Promise.all([
    db
      .from("salary_records")
      .select("*")
      .eq("user_id", auth.userId)
      .order("month", { ascending: false }),
    db
      .from("staff_salaries")
      .select("base_salary, effective_from")
      .eq("user_id", auth.userId)
      .order("effective_from", { ascending: false })
      .limit(1),
  ]);

  const records = recordsRes.data ?? [];
  const currentBase = salaryRes.data?.[0]?.base_salary;

  return (
    <div>
      <PageTitle
        title="My payslips"
        sub={
          currentBase != null
            ? `Current base salary: ${formatMoney(Number(currentBase))} / month`
            : "Your payroll records, visible only to you and payroll."
        }
      />
      {records.length === 0 && <Empty>No payslips yet.</Empty>}
      <div className="space-y-3">
        {records.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {new Date(r.month + "T00:00:00").toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <Badge tone={r.status === "paid" ? "success" : r.status === "confirmed" ? "accent" : "warning"}>
                    {r.status}
                  </Badge>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted sm:grid-cols-4">
                  <div>
                    <dt className="text-xs">Base</dt>
                    <dd className="text-ink">{formatMoney(Number(r.base))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs">Bonus</dt>
                    <dd className="text-success">+{formatMoney(Number(r.bonus))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs">Deductions</dt>
                    <dd className="text-danger">
                      −{formatMoney(Number(r.deductions) + Number(r.absence_deduction))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs">Total</dt>
                    <dd className="font-semibold text-ink">{formatMoney(Number(r.total))}</dd>
                  </div>
                </dl>
                {r.note && <p className="mt-2 text-xs text-muted">{r.note}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
