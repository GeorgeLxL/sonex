"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Plus, X } from "lucide-react";
import { Button, Dialog, Input, Label, Select, Textarea, Badge, Empty, Card } from "@/components/ui";
import { checkIn, checkOut, requestLeave, cancelLeave } from "@/server/actions/attendance";
import { formatDateHuman, formatDateTime } from "@/lib/dates";

export interface AttendanceRow {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  note: string | null;
}

export interface LeaveRow {
  id: string;
  start_date: string;
  end_date: string;
  type: string;
  is_paid: boolean;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "default"> = {
  present: "success",
  late: "warning",
  absent: "danger",
  leave: "default",
};

export function AttendancePanel({
  todayLog,
  logs,
  leaves,
}: {
  todayLog: AttendanceRow | null;
  logs: AttendanceRow[];
  leaves: LeaveRow[];
}) {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const result = await action();
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Today */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Today</h2>
            <p className="mt-1 text-sm text-muted">
              {todayLog?.check_in
                ? `Checked in ${formatDateTime(todayLog.check_in)}${todayLog.check_out ? ` — out ${formatDateTime(todayLog.check_out)}` : ""}`
                : "Not checked in yet."}
              {todayLog && (
                <Badge tone={STATUS_TONE[todayLog.status] ?? "default"} className="ml-2">
                  {todayLog.status}
                </Badge>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {!todayLog?.check_in && (
              <Button onClick={() => run(checkIn)}>
                <LogIn size={15} /> Check in
              </Button>
            )}
            {todayLog?.check_in && !todayLog.check_out && (
              <Button variant="secondary" onClick={() => run(checkOut)}>
                <LogOut size={15} /> Check out
              </Button>
            )}
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      {/* Leave requests */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Leave requests</h2>
          <Button variant="secondary" onClick={() => setRequesting(true)}>
            <Plus size={15} /> Request leave
          </Button>
        </div>
        {leaves.length === 0 && <Empty>No leave requests.</Empty>}
        <div className="space-y-2">
          {leaves.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3">
              <div>
                <div className="text-sm font-medium">
                  {formatDateHuman(l.start_date)} → {formatDateHuman(l.end_date)}
                  <span className="ml-2 text-xs text-muted">
                    {l.type}
                    {!l.is_paid && " (unpaid)"}
                  </span>
                </div>
                {l.reason && <div className="text-xs text-muted">{l.reason}</div>}
                {l.review_note && <div className="text-xs text-warning">Note: {l.review_note}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"}>
                  {l.status}
                </Badge>
                {l.status === "pending" && (
                  <button
                    onClick={() => run(() => cancelLeave(l.id))}
                    className="rounded p-1 text-muted hover:text-danger"
                    aria-label="Cancel request"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">Recent attendance</h2>
        {logs.length === 0 && <Empty>No attendance records yet.</Empty>}
        <div className="overflow-x-auto rounded-lg border border-line">
          {logs.length > 0 && (
            <table className="w-full bg-surface text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">In</th>
                  <th className="px-3 py-2 font-medium">Out</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">{formatDateHuman(l.work_date)}</td>
                    <td className="px-3 py-2 text-muted">{l.check_in ? formatDateTime(l.check_in) : "—"}</td>
                    <td className="px-3 py-2 text-muted">{l.check_out ? formatDateTime(l.check_out) : "—"}</td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS_TONE[l.status] ?? "default"}>{l.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={requesting} onClose={() => setRequesting(false)} title="Request leave">
        <form
          action={async (formData: FormData) => {
            const result = await requestLeave({
              start_date: formData.get("start_date"),
              end_date: formData.get("end_date"),
              type: formData.get("type"),
              reason: (formData.get("reason") as string) || undefined,
            });
            if (!result.ok) setError(result.error ?? "Failed");
            else {
              setRequesting(false);
              router.refresh();
            }
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>From *</Label>
              <Input name="start_date" type="date" required />
            </div>
            <div>
              <Label>To *</Label>
              <Input name="end_date" type="date" required />
            </div>
          </div>
          <div>
            <Label>Type</Label>
            <Select name="type" defaultValue="vacation">
              <option value="vacation">Vacation (paid)</option>
              <option value="sick">Sick (paid)</option>
              <option value="personal">Personal (paid)</option>
              <option value="unpaid">Unpaid leave</option>
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea name="reason" rows={2} maxLength={1000} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRequesting(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
