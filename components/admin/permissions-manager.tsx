"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Dialog, Input, Label, Select, Empty, Card } from "@/components/ui";
import { setRolePerm, setUserPerm, createRole } from "@/server/actions/settings";

export interface RoleInfo {
  id: string;
  name: string;
  display_name: string;
}
export interface PermInfo {
  code: string;
  label: string;
}

export function PermissionsManager({
  roles,
  permissions,
  rolePerms,
  users,
  selectedUserId,
  userPerms,
  userRoleName,
}: {
  roles: RoleInfo[];
  permissions: PermInfo[];
  /** "roleId:code" -> level */
  rolePerms: Record<string, string>;
  users: { id: string; full_name: string; role_display: string }[];
  selectedUserId: string | null;
  /** code -> level for the selected user */
  userPerms: Record<string, string>;
  userRoleName: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [addingRole, setAddingRole] = useState(false);

  const editableRoles = roles.filter((r) => r.name !== "coo");

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const result = await action();
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Role matrix */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Role defaults</h2>
            <p className="text-xs text-muted">
              Role decides default access. COO is super admin and is not listed.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setAddingRole(true)}>
            <Plus size={14} /> New role
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-2 py-2 font-medium">Permission</th>
                {editableRoles.map((r) => (
                  <th key={r.id} className="px-2 py-2 font-medium">{r.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.code} className="border-b border-line last:border-0">
                  <td className="px-2 py-2">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted">{p.code}</div>
                  </td>
                  {editableRoles.map((r) => (
                    <td key={r.id} className="px-2 py-2">
                      <Select
                        className="w-24"
                        value={rolePerms[`${r.id}:${p.code}`] ?? ""}
                        onChange={(e) =>
                          run(() =>
                            setRolePerm(
                              r.id,
                              p.code,
                              (e.target.value || null) as "read" | "write" | null,
                            ),
                          )
                        }
                      >
                        <option value="">—</option>
                        <option value="read">read</option>
                        <option value="write">write</option>
                      </Select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Per-user overrides */}
      <Card>
        <h2 className="text-sm font-semibold">Per-user overrides</h2>
        <p className="mb-3 text-xs text-muted">
          Overrides beat role defaults — including for the CEO. &ldquo;none&rdquo; revokes,
          &ldquo;inherit&rdquo; falls back to the role.
        </p>
        <Select
          className="mb-4 max-w-sm"
          value={selectedUserId ?? ""}
          onChange={(e) => router.push(`/admin/settings?user=${e.target.value}`)}
        >
          <option value="">— choose a user —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name} ({u.role_display})
            </option>
          ))}
        </Select>

        {!selectedUserId && <Empty>Pick a user to view or change their overrides.</Empty>}
        {selectedUserId && userRoleName === "coo" && (
          <Empty>The COO always has full access — nothing to override.</Empty>
        )}
        {selectedUserId && userRoleName !== "coo" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {permissions.map((p) => (
              <div
                key={p.code}
                className="flex items-center justify-between rounded border border-line p-2.5"
              >
                <div>
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-xs text-muted">{p.code}</div>
                </div>
                <Select
                  className="w-28"
                  value={userPerms[p.code] ?? ""}
                  onChange={(e) =>
                    run(() =>
                      setUserPerm(
                        selectedUserId,
                        p.code,
                        (e.target.value || null) as "none" | "read" | "write" | null,
                      ),
                    )
                  }
                >
                  <option value="">inherit</option>
                  <option value="none">none</option>
                  <option value="read">read</option>
                  <option value="write">write</option>
                </Select>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={addingRole} onClose={() => setAddingRole(false)} title="New role">
        <form
          action={async (fd: FormData) => {
            const result = await createRole({ display_name: fd.get("display_name") });
            if (!result.ok) setError(result.error ?? "Failed");
            else {
              setAddingRole(false);
              router.refresh();
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label>Role name *</Label>
            <Input name="display_name" required maxLength={100} placeholder="VP Engineering" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddingRole(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
