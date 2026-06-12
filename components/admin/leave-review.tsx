"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Plus, Pencil, Trash2 } from "lucide-react";
import { Button, Dialog, Input, Label, Select, Textarea, Badge, Empty } from "@/components/ui";
import { reviewLeave, adminSaveLeave, adminDeleteLeave } from "@/server/actions/attendance";
import { promptText, confirmDialog } from "@/lib/swal";
import { formatDateHuman } from "@/lib/dates";

export interface LeaveReviewRow {
  id: string;
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  type: string;
  is_paid: boolean;
  early_time: string | null;
  reason: string | null;
  status: string;
}

export interface LeaveTypeRow {
  name: string;
  is_paid: boolean;
  requires_time: boolean;
  single_day: boolean;
}

export function LeaveReview({
  leaves,
  staff,
  leaveTypes,
  canWrite,
}: {
  leaves: LeaveReviewRow[];
  staff: { id: string; full_name: string }[];
  leaveTypes: LeaveTypeRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Approver's paid/unpaid decision per pending request.
  const [paidChoice, setPaidChoice] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<LeaveReviewRow | null>(null);
  const [creating, setCreating] = useState(false);

  const pending = leaves.filter((l) => l.status === "pending");
  const others = leaves.filter((l) => l.status !== "pending");

  async function review(l: LeaveReviewRow, approve: boolean) {
    setError(null);
    let note: string | undefined;
    if (!approve) {
      const answer = await promptText("Reject leave request", "Reason for rejection (optional)");
      if (answer === null) return; // cancelled — don't reject
      note = answer || undefined;
    }
    const isPaid = approve ? (paidChoice[l.id] ?? l.is_paid) : undefined;
    const result = await reviewLeave(l.id, approve, note, isPaid);
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  function describe(l: LeaveReviewRow) {
    return (
      <>
        {l.type}
        {l.early_time && ` at ${l.early_time.slice(0, 5)}`}
        {l.status === "approved" && (l.is_paid ? " · paid" : " · unpaid")}
        {l.reason && ` — ${l.reason}`}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-danger">{error}</p>}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Pending ({pending.length})</h2>
        {pending.length === 0 && <Empty>No pending leave requests.</Empty>}
        <div className="space-y-2">
          {pending.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-surface p-3">
              <div>
                <div className="text-sm font-medium">
                  {l.user_name}
                  <span className="ml-2 text-muted">
                    {formatDateHuman(l.start_date)} → {formatDateHuman(l.end_date)}
                  </span>
                </div>
                <div className="text-xs text-muted">{describe(l)}</div>
              </div>
              {canWrite && (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={paidChoice[l.id] ?? l.is_paid}
                      onChange={(e) =>
                        setPaidChoice((prev) => ({ ...prev, [l.id]: e.target.checked }))
                      }
                    />
                    Paid (unchecked = salary deduction)
                  </label>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => review(l, true)}>
                      <Check size={14} /> Approve
                    </Button>
                    <Button variant="ghost" onClick={() => review(l, false)}>
                      <X size={14} /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">All leave records</h2>
          {canWrite && (
            <Button variant="secondary" onClick={() => { setCreating(true); setError(null); }}>
              <Plus size={14} /> Add leave
            </Button>
          )}
        </div>
        {others.length === 0 && <Empty>No reviewed leave records yet.</Empty>}
        <div className="space-y-2">
          {others.slice(0, 50).map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-surface p-3 text-sm">
              <div>
                <span className="font-medium">{l.user_name}</span>
                <span className="ml-2 text-muted">
                  {formatDateHuman(l.start_date)} → {formatDateHuman(l.end_date)}
                </span>
                <div className="text-xs text-muted">{describe(l)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={l.status === "approved" ? "success" : "danger"}>{l.status}</Badge>
                {canWrite && (
                  <>
                    <button
                      className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                      aria-label="Edit"
                      onClick={() => { setEditing(l); setError(null); }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                      aria-label="Delete"
                      onClick={async () => {
                        if (
                          await confirmDialog(
                            "Delete this leave record?",
                            "Payroll absence calculations will no longer count it.",
                            { danger: true, confirmText: "Delete" },
                          )
                        ) {
                          const result = await adminDeleteLeave(l.id);
                          if (!result.ok) setError(result.error ?? "Failed");
                          else router.refresh();
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(creating || editing) && (
        <LeaveDialog
          leave={editing ?? undefined}
          staff={staff}
          leaveTypes={leaveTypes}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function LeaveDialog({
  leave,
  staff,
  leaveTypes,
  onClose,
  onSaved,
}: {
  leave?: LeaveReviewRow;
  staff: { id: string; full_name: string }[];
  leaveTypes: LeaveTypeRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [type, setType] = useState(leave?.type ?? leaveTypes[0]?.name ?? "Vacation");

  const chosen = leaveTypes.find((t) => t.name === type);
  const isEarly = chosen?.requires_time ?? false;
  const isSingleDay = isEarly || (chosen?.single_day ?? false);

  return (
    <Dialog open onClose={onClose} title={leave ? "Edit leave record" : "Add leave record"} wide>
      <form
        action={async (fd: FormData) => {
          setPending(true);
          setError(null);
          const result = await adminSaveLeave(leave?.id ?? null, {
            user_id: fd.get("user_id"),
            start_date: fd.get("start_date"),
            end_date: isSingleDay ? fd.get("start_date") : fd.get("end_date"),
            type: fd.get("type"),
            early_time: isEarly ? fd.get("early_time") : undefined,
            reason: (fd.get("reason") as string) || undefined,
            is_paid: fd.get("is_paid") === "on",
            status: fd.get("status"),
          });
          setPending(false);
          if (!result.ok) setError(result.error ?? "Failed");
          else onSaved();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Staff *</Label>
            <Select name="user_id" required defaultValue={leave?.user_id} disabled={!!leave}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </Select>
            {leave && <input type="hidden" name="user_id" value={leave.user_id} />}
          </div>
          <div>
            <Label>Reason</Label>
            <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {leaveTypes.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.is_paid ? "paid" : "unpaid"} default)
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{isSingleDay ? "Date *" : "From *"}</Label>
            <Input name="start_date" type="date" required defaultValue={leave?.start_date} />
          </div>
          {isEarly ? (
            <div>
              <Label>Leave at (their local time) *</Label>
              <Input name="early_time" type="time" required defaultValue={leave?.early_time?.slice(0, 5)} />
            </div>
          ) : isSingleDay ? null : (
            <div>
              <Label>To *</Label>
              <Input name="end_date" type="date" required defaultValue={leave?.end_date} />
            </div>
          )}
        </div>
        <div>
          <Label>Reason</Label>
          <Textarea name="reason" rows={2} maxLength={1000} defaultValue={leave?.reason ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue={leave?.status ?? "approved"}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="is_paid" defaultChecked={leave ? leave.is_paid : true} />
            Paid (unchecked = salary deduction)
          </label>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
