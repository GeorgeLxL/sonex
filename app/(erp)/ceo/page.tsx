import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can } from "@/lib/auth";
import { PageTitle, Card, Badge, Empty } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { formatDateTime, todayInTz } from "@/lib/dates";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types";

export const metadata: Metadata = { title: "Executive dashboard" };

export default async function CeoDashboard() {
  const auth = await requireAuth();
  const today = todayInTz(auth.profile.timezone);
  const db = await supabaseServer();

  // RLS limits each query to what this user may see; sections render
  // only when the permission (role default or COO-granted override) exists.
  const [projectsRes, milestonesRes, staffRes, clientsRes, paymentsRes, expensesRes, activityRes] =
    await Promise.all([
      can(auth, "projects") ? db.from("projects").select("name, status, deadline, amount").eq("is_archived", false) : Promise.resolve({ data: null }),
      can(auth, "projects") ? db.from("project_milestones").select("status, amount") : Promise.resolve({ data: null }),
      can(auth, "staff") ? db.from("profiles").select("id").eq("is_active", true) : Promise.resolve({ data: null }),
      can(auth, "clients") ? db.from("clients").select("id, status") : Promise.resolve({ data: null }),
      can(auth, "finance") ? db.from("payments").select("amount") : Promise.resolve({ data: null }),
      can(auth, "finance") ? db.from("expenses").select("amount") : Promise.resolve({ data: null }),
      can(auth, "reports")
        ? db
            .from("activity_logs")
            .select("*, profiles!activity_logs_user_id_fkey(full_name), projects(name)")
            .order("created_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: null }),
    ]);

  const projects = projectsRes.data ?? [];
  const received =
    projects.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0) +
    (milestonesRes.data ?? []).filter((m) => m.status === "paid").reduce((s, m) => s + Number(m.amount), 0);
  const outstanding = projects.filter((p) => p.status === "done").reduce((s, p) => s + Number(p.amount), 0);
  const overdue = projects.filter(
    (p) => p.deadline && p.deadline < today && p.status !== "done" && p.status !== "paid",
  );
  const paymentsTotal = (paymentsRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const expensesTotal = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0);

  const stats: { label: string; value: string | number; danger?: boolean }[] = [];
  if (projectsRes.data) {
    stats.push({ label: "Received (Paid)", value: formatMoney(received) });
    stats.push({ label: "Done, awaiting payment", value: formatMoney(outstanding) });
    stats.push({ label: "Active projects", value: projects.filter((p) => p.status !== "paid").length });
    stats.push({ label: "Overdue projects", value: overdue.length, danger: overdue.length > 0 });
  }
  if (staffRes.data) stats.push({ label: "Active staff", value: staffRes.data.length });
  if (clientsRes.data) {
    stats.push({ label: "Clients", value: clientsRes.data.length });
  }
  if (paymentsRes.data) {
    stats.push({ label: "Payments recorded", value: formatMoney(paymentsTotal) });
    stats.push({ label: "Net (payments − expenses)", value: formatMoney(paymentsTotal - expensesTotal) });
  }

  return (
    <div>
      <PageTitle
        title="Executive dashboard"
        sub="Read-only company overview. Your access is managed by the COO."
      />

      {stats.length === 0 && (
        <Empty>No report access granted yet — ask the COO to enable your summaries.</Empty>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className={`text-2xl font-bold ${s.danger ? "text-danger" : ""}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-muted">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {projectsRes.data && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Project summary</h2>
            <div className="space-y-2">
              {(["todo", "in_progress", "review", "done", "paid"] as ProjectStatus[]).map((s) => (
                <div key={s} className="flex items-center justify-between rounded border border-line p-2.5 text-sm">
                  <span>{PROJECT_STATUS_LABEL[s]}</span>
                  <Badge tone={s === "paid" ? "success" : "default"}>
                    {projects.filter((p) => p.status === s).length}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activityRes.data && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Company activity</h2>
            {(activityRes.data ?? []).length === 0 && <Empty>No recent activity.</Empty>}
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
        )}
      </div>
    </div>
  );
}
