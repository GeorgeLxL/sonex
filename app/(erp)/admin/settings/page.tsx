import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { PermissionsManager } from "@/components/admin/permissions-manager";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  await requirePerm("permissions", "write");
  const { user: selectedUserId } = await searchParams;
  const db = await supabaseServer();

  const [rolesRes, permsRes, rolePermsRes, usersRes, userPermsRes, selectedRes] =
    await Promise.all([
      db.from("roles").select("id, name, display_name").order("display_name"),
      db.from("permissions").select("code, label").order("code"),
      db.from("role_permissions").select("role_id, code, level"),
      db
        .from("profiles")
        .select("id, full_name, roles(display_name)")
        .eq("is_active", true)
        .order("full_name"),
      selectedUserId
        ? db.from("user_permissions").select("code, level").eq("user_id", selectedUserId)
        : Promise.resolve({ data: [] }),
      selectedUserId
        ? db.from("profiles").select("roles(name)").eq("id", selectedUserId).single()
        : Promise.resolve({ data: null }),
    ]);

  const rolePerms: Record<string, string> = {};
  for (const rp of rolePermsRes.data ?? []) rolePerms[`${rp.role_id}:${rp.code}`] = rp.level;

  const userPerms: Record<string, string> = {};
  for (const up of userPermsRes.data ?? []) userPerms[up.code] = up.level;

  return (
    <div>
      <PageTitle
        title="Roles & permissions"
        sub="Role decides default access; per-user overrides extend or reduce it — including for the CEO."
      />
      <PermissionsManager
        roles={rolesRes.data ?? []}
        permissions={permsRes.data ?? []}
        rolePerms={rolePerms}
        users={(usersRes.data ?? []).map((u) => ({
          id: u.id,
          full_name: u.full_name,
          role_display: (u.roles as unknown as { display_name: string } | null)?.display_name ?? "",
        }))}
        selectedUserId={selectedUserId ?? null}
        userPerms={userPerms}
        userRoleName={
          ((selectedRes.data as { roles?: { name: string } } | null)?.roles as
            | { name: string }
            | undefined)?.name ?? null
        }
      />
    </div>
  );
}
