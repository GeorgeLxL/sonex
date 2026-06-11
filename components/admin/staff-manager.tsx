"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, KeyRound, Check } from "lucide-react";
import { Button, Dialog, Input, Label, Select, Badge, Empty, Card } from "@/components/ui";
import { updateStaff, resetStaffPassword } from "@/server/actions/staff";
import { initials } from "@/lib/utils";

export interface StaffRow {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_name: string;
  role_display: string;
  department_id: string | null;
  department_name: string | null;
  is_active: boolean;
  joined_at: string | null;
}

export function StaffManager({
  staff,
  roles,
  departments,
  meId,
  meIsCoo,
}: {
  staff: StaffRow[];
  roles: { id: string; name: string; display_name: string }[];
  departments: { id: string; name: string }[];
  meId: string;
  meIsCoo: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [resetFor, setResetFor] = useState<StaffRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Self-registered accounts waiting for activation (no joined_at yet).
  const pendingApproval = staff.filter((s) => !s.is_active && !s.joined_at);

  async function approve(s: StaffRow) {
    setError(null);
    const result = await updateStaff(s.id, { is_active: true });
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {pendingApproval.length > 0 && (
        <Card className="mb-5 border-warning/50">
          <h2 className="mb-3 text-sm font-semibold">
            Pending approval ({pendingApproval.length})
          </h2>
          <div className="space-y-2">
            {pendingApproval.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line p-2.5">
                <div>
                  <div className="text-sm font-medium">{s.full_name}</div>
                  <div className="text-xs text-muted">{s.email}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => approve(s)}>
                    <Check size={14} /> Approve
                  </Button>
                  <Button variant="secondary" onClick={() => { setEditing(s); setError(null); }}>
                    <Pencil size={14} /> Set role first
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="mb-3 text-xs text-muted">
        Staff create their own accounts at /register — new accounts appear above for approval.
      </p>

      {staff.length === 0 && <Empty>No staff yet.</Empty>}

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full bg-surface text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Staff</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Department</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                      {initials(s.full_name)}
                    </span>
                    <div>
                      <div className="font-medium">
                        {s.full_name}
                        {s.id === meId && <span className="ml-1 text-xs text-muted">(you)</span>}
                      </div>
                      <div className="text-xs text-muted">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">{s.role_display}</td>
                <td className="px-3 py-2 text-muted">{s.department_name ?? "—"}</td>
                <td className="px-3 py-2">
                  {s.is_active ? <Badge tone="success">active</Badge> : <Badge tone="danger">inactive</Badge>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                      onClick={() => { setEditing(s); setError(null); }}
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                      onClick={() => { setResetFor(s); setError(null); }}
                      aria-label="Reset password"
                    >
                      <KeyRound size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit */}
      {editing && (
        <Dialog open onClose={() => setEditing(null)} title={`Edit ${editing.full_name}`}>
          <form
            action={async (formData: FormData) => {
              setPending(true);
              setError(null);
              const result = await updateStaff(editing.id, {
                full_name: formData.get("full_name"),
                role_id: formData.get("role_id"),
                department_id: formData.get("department_id") || null,
                is_active: formData.get("is_active") === "on",
              });
              setPending(false);
              if (!result.ok) setError(result.error ?? "Failed");
              else {
                setEditing(null);
                router.refresh();
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Full name</Label>
              <Input name="full_name" defaultValue={editing.full_name} required maxLength={200} />
            </div>
            <div>
              <Label>Role</Label>
              <Select name="role_id" defaultValue={editing.role_id} disabled={editing.role_name === "coo" && !meIsCoo}>
                {roles
                  .filter((r) => meIsCoo || r.name !== "coo" || r.id === editing.role_id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.display_name}</option>
                  ))}
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select name="department_id" defaultValue={editing.department_id ?? ""}>
                <option value="">— none —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={editing.is_active} disabled={editing.id === meId} />
              Active (inactive accounts cannot sign in)
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Reset password */}
      {resetFor && (
        <Dialog open onClose={() => setResetFor(null)} title={`Reset password — ${resetFor.full_name}`}>
          <form
            action={async (formData: FormData) => {
              setPending(true);
              setError(null);
              const result = await resetStaffPassword(resetFor.id, String(formData.get("password") ?? ""));
              setPending(false);
              if (!result.ok) setError(result.error ?? "Failed");
              else setResetFor(null);
            }}
            className="space-y-4"
          >
            <div>
              <Label>New temporary password *</Label>
              <Input name="password" required minLength={8} maxLength={100} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setResetFor(null)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Resetting…" : "Reset"}</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
