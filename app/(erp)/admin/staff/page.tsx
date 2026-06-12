import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm, can } from "@/lib/auth";
import { StaffManager, type StaffRow } from "@/components/admin/staff-manager";
import { CrudPanel, type Row } from "@/components/admin/crud-panel";
import { ENTITIES } from "@/lib/admin-entities";
import { TabNav } from "@/components/admin/tab-nav";
import { PageTitle, Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Staff" };

const TABS = [
  { key: "staff", label: "Staff" },
  { key: "departments", label: "Departments" },
];

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await requirePerm("staff", "read");
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "staff";
  const db = await supabaseServer();
  const canWrite = can(auth, "staff", "write");

  const [profilesRes, rolesRes, departmentsRes] = await Promise.all([
    db
      .from("profiles")
      .select("*, roles(name, display_name), departments(name)")
      .order("full_name"),
    db.from("roles").select("id, name, display_name").order("display_name"),
    db.from("departments").select("id, name").order("name"),
  ]);

  if (tab === "departments") {
    return (
      <div>
        <PageTitle title="Staff" sub="Accounts, roles and departments." />
        <TabNav base="/admin/staff" tabs={TABS} active={tab} />
        <CrudPanel
          entityKey="departments"
          entity={ENTITIES.departments}
          rows={(departmentsRes.data ?? []) as Row[]}
          columns={[{ key: "name", label: "Department" }]}
          canWrite={canWrite}
        />
      </div>
    );
  }

  const staff: StaffRow[] = (profilesRes.data ?? []).map((p) => {
    const role = p.roles as unknown as { name: string; display_name: string } | null;
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      role_id: p.role_id,
      role_name: role?.name ?? "staff",
      role_display: role?.display_name ?? "Staff",
      department_id: p.department_id,
      department_name: (p.departments as { name: string } | null)?.name ?? null,
      is_active: p.is_active,
      joined_at: p.joined_at,
      work_start: p.work_start ?? "09:00",
      work_end: p.work_end ?? "18:00",
    };
  });

  return (
    <div>
      <PageTitle title="Staff" sub="Accounts, roles and departments." />
      <TabNav base="/admin/staff" tabs={TABS} active={tab} />
      {canWrite ? (
        <StaffManager
          staff={staff}
          roles={rolesRes.data ?? []}
          departments={departmentsRes.data ?? []}
          meId={auth.userId}
          meIsCoo={auth.role === "coo"}
        />
      ) : staff.length === 0 ? (
        <Empty>No staff.</Empty>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full bg-surface text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Department</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-medium">{s.full_name}</td>
                  <td className="px-3 py-2 text-muted">{s.email}</td>
                  <td className="px-3 py-2">{s.role_display}</td>
                  <td className="px-3 py-2 text-muted">{s.department_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
