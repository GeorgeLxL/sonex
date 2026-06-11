"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wand2 } from "lucide-react";
import { Button, Dialog, Input, Label, Select, Badge, Empty, Card } from "@/components/ui";
import {
  setBaseSalary,
  generateDrafts,
  addAdjustment,
  setRecordStatus,
  deleteDraft,
} from "@/server/actions/payroll";
import { formatMoney } from "@/lib/utils";
import { confirmDialog } from "@/lib/swal";

export interface SalaryRecordRow {
  id: string;
  user_id: string;
  user_name: string;
  month: string;
  base: number;
  bonus: number;
  deductions: number;
  absence_deduction: number;
  total: number;
  status: "draft" | "confirmed" | "paid";
  note: string | null;
  adjustments: { id: string; amount: number; reason: string }[];
}

export interface BaseSalaryRow {
  id: string;
  user_id: string;
  user_name: string;
  base_salary: number;
  effective_from: string;
}

export function PayrollManager({
  month,
  records,
  baseSalaries,
  staff,
}: {
  month: string; // YYYY-MM
  records: SalaryRecordRow[];
  baseSalaries: BaseSalaryRow[];
  staff: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adjustFor, setAdjustFor] = useState<SalaryRecordRow | null>(null);
  const [settingSalary, setSettingSalary] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setMessage(null);
    const result = await action();
    if (!result.ok) setError(result.error ?? "Failed");
    else {
      if (result.error) setMessage(result.error); // info text from generateDrafts
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      {/* Month records */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <form
            className="flex items-center gap-2"
            action={(fd) => {
              const m = fd.get("month") as string;
              if (m) router.push(`/admin/payroll?month=${m}`);
            }}
          >
            <Input name="month" type="month" defaultValue={month} className="w-44" />
            <Button type="submit" variant="secondary">Show</Button>
          </form>
          <Button onClick={() => run(() => generateDrafts(month))}>
            <Wand2 size={15} /> Generate drafts for {month}
          </Button>
        </div>
        {message && <p className="mb-2 text-sm text-success">{message}</p>}
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}

        {records.length === 0 && (
          <Empty>No salary records for {month}. Generate drafts to calculate from base salary + attendance.</Empty>
        )}

        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.user_name}</span>
                    <Badge tone={r.status === "paid" ? "success" : r.status === "confirmed" ? "accent" : "warning"}>
                      {r.status}
                    </Badge>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-5">
                    <div><dt className="text-xs text-muted">Base</dt><dd>{formatMoney(r.base)}</dd></div>
                    <div><dt className="text-xs text-muted">Bonus</dt><dd className="text-success">+{formatMoney(r.bonus)}</dd></div>
                    <div><dt className="text-xs text-muted">Deductions</dt><dd className="text-danger">−{formatMoney(r.deductions)}</dd></div>
                    <div><dt className="text-xs text-muted">Absence</dt><dd className="text-danger">−{formatMoney(r.absence_deduction)}</dd></div>
                    <div><dt className="text-xs text-muted">Total</dt><dd className="font-semibold">{formatMoney(r.total)}</dd></div>
                  </dl>
                  {r.adjustments.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted">
                      {r.adjustments.map((a) => (
                        <li key={a.id}>
                          {a.amount >= 0 ? "+" : "−"}{formatMoney(Math.abs(a.amount))} — {a.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status !== "paid" && (
                    <Button variant="secondary" onClick={() => setAdjustFor(r)}>
                      <Plus size={14} /> Adjust
                    </Button>
                  )}
                  {r.status === "draft" && (
                    <>
                      <Button onClick={() => run(() => setRecordStatus(r.id, "confirmed"))}>Confirm</Button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          if (await confirmDialog("Delete this draft?", undefined, { danger: true, confirmText: "Delete" })) {
                            run(() => deleteDraft(r.id));
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                  {r.status === "confirmed" && (
                    <Button onClick={async () => {
                      if (await confirmDialog(
                        `Mark ${r.user_name}'s ${month} salary as PAID?`,
                        "Real payment happens outside the system — this records the fact.",
                        { confirmText: "Mark paid" },
                      )) {
                        run(() => setRecordStatus(r.id, "paid"));
                      }
                    }}>
                      Mark paid
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Base salaries */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Base salaries</h2>
          <Button variant="secondary" onClick={() => setSettingSalary(true)}>
            <Plus size={15} /> Set base salary
          </Button>
        </div>
        {baseSalaries.length === 0 && <Empty>No base salaries set — drafts cannot be generated without them.</Empty>}
        {baseSalaries.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full bg-surface text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Staff</th>
                  <th className="px-3 py-2 font-medium">Base / month</th>
                  <th className="px-3 py-2 font-medium">Effective from</th>
                </tr>
              </thead>
              <tbody>
                {baseSalaries.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 font-medium">{s.user_name}</td>
                    <td className="px-3 py-2">{formatMoney(s.base_salary)}</td>
                    <td className="px-3 py-2 text-muted">{s.effective_from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Adjust dialog */}
      {adjustFor && (
        <Dialog open onClose={() => setAdjustFor(null)} title={`Adjust — ${adjustFor.user_name} (${month})`}>
          <form
            action={async (fd: FormData) => {
              const result = await addAdjustment(adjustFor.id, {
                amount: fd.get("amount"),
                reason: fd.get("reason"),
              });
              if (!result.ok) setError(result.error ?? "Failed");
              else {
                setAdjustFor(null);
                router.refresh();
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Amount (positive = bonus, negative = deduction) *</Label>
              <Input name="amount" type="number" step="0.01" required />
            </div>
            <div>
              <Label>Reason *</Label>
              <Input name="reason" required maxLength={500} placeholder="Performance bonus / equipment damage / …" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAdjustFor(null)}>Cancel</Button>
              <Button type="submit">Add adjustment</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Base salary dialog */}
      <Dialog open={settingSalary} onClose={() => setSettingSalary(false)} title="Set base salary">
        <form
          action={async (fd: FormData) => {
            const result = await setBaseSalary({
              user_id: fd.get("user_id"),
              base_salary: fd.get("base_salary"),
              effective_from: fd.get("effective_from"),
            });
            if (!result.ok) setError(result.error ?? "Failed");
            else {
              setSettingSalary(false);
              router.refresh();
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label>Staff *</Label>
            <Select name="user_id" required>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Base salary / month *</Label>
              <Input name="base_salary" type="number" min={0} step="0.01" required />
            </div>
            <div>
              <Label>Effective from *</Label>
              <Input name="effective_from" type="date" required />
            </div>
          </div>
          <p className="text-xs text-muted">
            A new effective date keeps history — past payslips stay correct after raises.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSettingSalary(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
