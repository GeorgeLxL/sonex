import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { PageTitle, Badge, Empty } from "@/components/ui";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/types";
import { formatDateHuman, todayInTz } from "@/lib/dates";

export const metadata: Metadata = { title: "My project tasks" };

export default async function WorkspaceTasksPage() {
  const auth = await requireAuth();
  const db = await supabaseServer();

  const { data } = await db
    .from("tasks")
    .select("*, projects!inner(id, name, is_archived)")
    .eq("assignee_id", auth.userId)
    .eq("is_archived", false)
    .eq("projects.is_archived", false)
    .order("due_date", { ascending: true, nullsFirst: false });

  const tasks = data ?? [];
  const today = todayInTz(auth.profile.timezone);
  const byStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s);

  return (
    <div>
      <PageTitle
        title="My project tasks"
        sub="Tasks assigned to you. Finish work by moving it to Review on the project board."
      />
      {tasks.length === 0 && <Empty>No tasks assigned to you right now.</Empty>}
      <div className="space-y-6">
        {TASK_STATUSES.map((status) => {
          const group = byStatus(status);
          if (group.length === 0) return null;
          return (
            <section key={status}>
              <h2 className="mb-2 text-sm font-semibold text-muted">
                {TASK_STATUS_LABEL[status]} ({group.length})
              </h2>
              <div className="space-y-2">
                {group.map((t) => {
                  const project = t.projects as unknown as { id: string; name: string };
                  const overdue = t.due_date && t.due_date < today && status !== "done";
                  return (
                    <Link
                      key={t.id}
                      href={`/workspace/projects/${project.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-surface p-3 transition-colors hover:border-accent"
                    >
                      <div>
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="text-xs text-muted">{project.name}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {t.is_urgent && <Badge tone="danger">Urgent</Badge>}
                        {t.is_important && <Badge tone="warning">Important</Badge>}
                        {t.due_date && (
                          <span className={overdue ? "font-medium text-danger" : "text-muted"}>
                            {formatDateHuman(t.due_date)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
