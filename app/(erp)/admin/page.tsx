import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can, isAdminish, homeFor } from "@/lib/auth";
import { PageTitle, Card, Empty, Badge } from "@/components/ui";
import { todayInTz, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  const auth = await requireAuth();
  if (auth.role === "ceo" || !isAdminish(auth)) redirect(homeFor(auth));

  const db = await supabaseServer();
  const today = todayInTz(auth.profile.timezone);

  const [projectsRes, leavesRes, inquiriesRes, candidatesRes, staffRes, activityRes] =
    await Promise.all([
      can(auth, "projects")
        ? db.from("projects").select("id, name, status, deadline, amount").eq("is_archived", false)
        : Promise.resolve({ data: null }),
      can(auth, "attendance")
        ? db.from("leave_requests").select("id").eq("status", "pending")
        : Promise.resolve({ data: null }),
      can(auth, "clients") || can(auth, "website")
        ? db.from("contact_inquiries").select("id").eq("status", "new")
        : Promise.resolve({ data: null }),
      can(auth, "recruitment")
        ? db.from("candidates").select("id").in("status", ["applied", "screening"])
        : Promise.resolve({ data: null }),
      can(auth, "staff")
        ? db.from("profiles").select("id").eq("is_active", true)
        : Promise.resolve({ data: null }),
      db
        .from("activity_logs")
        .select("*, profiles!activity_logs_user_id_fkey(full_name), projects(name)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const projects = projectsRes.data;
  const overdue = (projects ?? []).filter(
    (p) => p.deadline && p.deadline < today && p.status !== "done" && p.status !== "paid",
  );
  const unpaidDone = (projects ?? []).filter((p) => p.status === "done");

  const stats: { label: string; value: string | number; href: string; danger?: boolean }[] = [];
  if (projects) {
    stats.push({ label: "Active projects", value: projects.filter((p) => p.status !== "paid").length, href: "/admin/projects" });
    stats.push({ label: "Overdue projects", value: overdue.length, href: "/admin/projects", danger: overdue.length > 0 });
    stats.push({
      label: "Done, not yet Paid",
      value: formatMoney(unpaidDone.reduce((s, p) => s + Number(p.amount), 0)),
      href: "/admin/projects",
    });
  }
  if (leavesRes.data) {
    stats.push({ label: "Pending leave requests", value: leavesRes.data.length, href: "/admin/attendance", danger: leavesRes.data.length > 0 });
  }
  if (inquiriesRes.data) {
    stats.push({ label: "New inquiries", value: inquiriesRes.data.length, href: "/admin/clients?tab=inquiries" });
  }
  if (candidatesRes.data) {
    stats.push({ label: "Candidates to review", value: candidatesRes.data.length, href: "/admin/recruitment" });
  }
  if (staffRes.data) {
    stats.push({ label: "Active staff", value: staffRes.data.length, href: "/admin/staff" });
  }

  return (
    <div>
      <PageTitle title="Dashboard" sub={`Welcome back, ${auth.profile.full_name.split(" ")[0]}.`} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-accent">
              <div className={`text-2xl font-bold ${s.danger ? "text-danger" : ""}`}>{s.value}</div>
              <div className="mt-0.5 text-xs text-muted">{s.label}</div>
            </Card>
          </Link>
        ))}
        {stats.length === 0 && <Empty>No admin modules are assigned to you.</Empty>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {projects && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Pipeline</h2>
            <div className="space-y-2">
              {(["todo", "in_progress", "review", "done", "paid"] as ProjectStatus[]).map((s) => {
                const count = (projects ?? []).filter((p) => p.status === s).length;
                return (
                  <div key={s} className="flex items-center justify-between rounded border border-line p-2.5 text-sm">
                    <span>{PROJECT_STATUS_LABEL[s]}</span>
                    <Badge tone={s === "paid" ? "success" : "default"}>{count}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
          {(activityRes.data ?? []).length === 0 && <Empty>No activity visible to you yet.</Empty>}
          <div className="space-y-2.5">
            {(activityRes.data ?? []).map((a) => (
              <div key={a.id} className="border-b border-line pb-2.5 text-sm last:border-0">
                <span className="font-medium">
                  {(a.profiles as { full_name: string } | null)?.full_name ?? "Someone"}
                </span>{" "}
                <span className="text-muted">{String(a.action).replace(/_/g, " ")}</span>
                {(a.projects as { name: string } | null)?.name && (
                  <span className="text-muted"> · {(a.projects as { name: string }).name}</span>
                )}
                <div className="text-xs text-muted">{formatDateTime(a.created_at)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
