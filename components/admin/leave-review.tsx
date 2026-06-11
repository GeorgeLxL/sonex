"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button, Badge, Empty } from "@/components/ui";
import { reviewLeave } from "@/server/actions/attendance";
import { promptText } from "@/lib/swal";
import { formatDateHuman } from "@/lib/dates";

export interface LeaveReviewRow {
  id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  type: string;
  is_paid: boolean;
  early_time: string | null;
  reason: string | null;
  status: string;
}

export function LeaveReview({ leaves, canWrite }: { leaves: LeaveReviewRow[]; canWrite: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const pending = leaves.filter((l) => l.status === "pending");
  const reviewed = leaves.filter((l) => l.status !== "pending");

  async function review(id: string, approve: boolean) {
    setError(null);
    let note: string | undefined;
    if (!approve) {
      const answer = await promptText("Reject leave request", "Reason for rejection (optional)");
      if (answer === null) return; // cancelled — don't reject
      note = answer || undefined;
    }
    const result = await reviewLeave(id, approve, note);
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-danger">{error}</p>}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Pending ({pending.length})</h2>
        {pending.length === 0 && <Empty>No pending leave requests.</Empty>}
        <div className="space-y-2">
          {pending.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
              <div>
                <div className="text-sm font-medium">
                  {l.user_name}
                  <span className="ml-2 text-muted">
                    {formatDateHuman(l.start_date)} → {formatDateHuman(l.end_date)}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {l.type === "early_leave" ? "leave early" : l.type}
                  {l.early_time && ` at ${l.early_time.slice(0, 5)}`}
                  {!l.is_paid && " (unpaid — deducted from salary)"}
                  {l.reason && ` — ${l.reason}`}
                </div>
              </div>
              {canWrite && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => review(l.id, true)}>
                    <Check size={14} /> Approve
                  </Button>
                  <Button variant="ghost" onClick={() => review(l.id, false)}>
                    <X size={14} /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Recently reviewed</h2>
        {reviewed.length === 0 && <Empty>Nothing reviewed yet.</Empty>}
        <div className="space-y-2">
          {reviewed.slice(0, 15).map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-line bg-surface p-3 text-sm">
              <span>
                {l.user_name} · {formatDateHuman(l.start_date)} → {formatDateHuman(l.end_date)}
                <span className="ml-2 text-xs text-muted">{l.type === "early_leave" ? "leave early" : l.type}</span>
              </span>
              <Badge tone={l.status === "approved" ? "success" : "danger"}>{l.status}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
