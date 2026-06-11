import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { todayInTz, addDays, formatDateHuman } from "@/lib/dates";
import { PageTitle, Badge, Card, Empty } from "@/components/ui";
import { getMyPersonalTasks } from "@/server/queries/personal";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types";

export const metadata: Metadata = { title: "My dashboard" };

export default async function WorkspaceDashboard() {
  const auth = await requireAuth();
  const db = await supabaseServer();
  const today = todayInTz(auth.profile.timezone);
  const soon = addDays(today, 7);

  const [tasksRes, projectsRes, announcementsRes, attendanceRes, personal] = await Promise.all([
    db
      .from("tasks")
      .select("id, title, due_date, status, is_urgent, is_important, projects!inner(id, name, is_archived)")
      .eq("assignee_id", auth.userId)
      .eq("is_archived", false)
      .eq("projects.is_archived", false)
      .neq("status", "done"),
    db
      .from("projects")
      .select("id, name, deadline, status")
      .eq("is_archived", false)
      .not("status", "in", "(done,paid)"),
    db.from("announcements").select("*").order("published_at", { ascending: false }).limit(3),
    db
      .from("attendance_logs")
      .select("check_in, check_out, status")
      .eq("user_id", auth.userId)
      .eq("work_date", today)
      .maybeSingle(),
    getMyPersonalTasks(auth.profile.timezone),
  ]);

  const myTasks = tasksRes.data ?? [];
  const overdueTasks = myTasks.filter((t) => t.due_date && t.due_date < today);
  const upcomingTasks = myTasks.filter((t) => t.due_date && t.due_date >= today && t.due_date <= soon);
  const projects = projectsRes.data ?? [];
  const overdueProjects = projects.filter((p) => p.deadline && p.deadline < today);
  const upcomingProjects = projects.filter((p) => p.deadline && p.deadline >= today && p.deadline <= soon);
  const todayPersonal = personal.filter(
    (t) => !t.is_archived && !t.is_fully_complete && t.status !== "done" && (t.date === today || t.is_recurring),
  );
  const att = attendanceRes.data;

  const stats = [
    { label: "My open tasks", value: myTasks.length, href: "/workspace/tasks" },
    { label: "Overdue tasks", value: overdueTasks.length, href: "/workspace/tasks", danger: overdueTasks.length > 0 },
    { label: "Today's personal todos", value: todayPersonal.length, href: "/workspace/personal" },
    {
      label: "Attendance",
      value: att?.check_in ? (att.check_out ? "Done" : "In") : "Not in",
      href: "/workspace/attendance",
      danger: !att?.check_in,
    },
  ];

  return (
    <div>
      <PageTitle
        title={`Hello, ${auth.profile.full_name.split(" ")[0]}`}
        sub={formatDateHuman(today)}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-accent">
              <div className={`text-2xl font-bold ${s.danger ? "text-danger" : ""}`}>{s.value}</div>
              <div className="mt-0.5 text-xs text-muted">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Upcoming &amp; overdue projects</h2>
          {overdueProjects.length + upcomingProjects.length === 0 && (
            <Empty>Nothing due in the next 7 days.</Empty>
          )}
          <div className="space-y-2">
            {[...overdueProjects, ...upcomingProjects].map((p) => (
              <Link
                key={p.id}
                href={`/workspace/projects/${p.id}`}
                className="flex items-center justify-between rounded border border-line p-2.5 text-sm transition-colors hover:border-accent"
              >
                <span className="font-medium">{p.name}</span>
                <span className="flex items-center gap-2 text-xs">
                  <Badge>{PROJECT_STATUS_LABEL[p.status as ProjectStatus]}</Badge>
                  <span className={p.deadline && p.deadline < today ? "font-medium text-danger" : "text-muted"}>
                    {formatDateHuman(p.deadline)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">My tasks needing attention</h2>
          {overdueTasks.length + upcomingTasks.length === 0 && (
            <Empty>No deadlines in the next 7 days.</Empty>
          )}
          <div className="space-y-2">
            {[...overdueTasks, ...upcomingTasks].slice(0, 8).map((t) => {
              const project = t.projects as unknown as { id: string; name: string };
              return (
                <Link
                  key={t.id}
                  href={`/workspace/projects/${project.id}`}
                  className="flex items-center justify-between rounded border border-line p-2.5 text-sm transition-colors hover:border-accent"
                >
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted">{project.name}</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs">
                    {t.is_urgent && <Badge tone="danger">U</Badge>}
                    {t.is_important && <Badge tone="warning">I</Badge>}
                    <span className={t.due_date && t.due_date < today ? "font-medium text-danger" : "text-muted"}>
                      {formatDateHuman(t.due_date)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Announcements</h2>
        {(announcementsRes.data ?? []).length === 0 && <Empty>No announcements.</Empty>}
        <div className="space-y-3">
          {(announcementsRes.data ?? []).map((a) => (
            <div key={a.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.title}</span>
                <time className="text-xs text-muted">{formatDateHuman(a.published_at?.slice(0, 10))}</time>
              </div>
              <p className="mt-1 text-sm text-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
