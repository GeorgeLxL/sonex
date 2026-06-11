import "server-only";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can } from "@/lib/auth";
import { ProjectHeader } from "@/components/projects/project-header";
import {
  ProjectDetail,
  type TaskRow,
  type MemberRow,
  type CommentRow,
  type AllocationRow,
} from "@/components/projects/project-detail";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import type { ProjectMilestone, ProjectStatus } from "@/types";

/** Shared by /admin/projects/[id] and /workspace/projects/[id]. */
export async function ProjectDetailPage({ projectId }: { projectId: string }) {
  const auth = await requireAuth();
  const db = await supabaseServer();

  const { data: project } = await db
    .from("projects")
    .select("*, clients(name), owner:profiles!projects_owner_id_fkey(full_name)")
    .eq("id", projectId)
    .single();
  if (!project) notFound();

  const canManage = project.owner_id === auth.userId || can(auth, "projects", "write");
  const canMarkPaid = can(auth, "projects.mark_paid", "write");

  const [tasksRes, milestonesRes, membersRes, commentsRes, allocationRes] = await Promise.all([
    db
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(full_name)")
      .eq("project_id", projectId)
      .order("sort_order"),
    db.from("project_milestones").select("*").eq("project_id", projectId).order("sort_order"),
    db
      .from("project_members")
      .select("user_id, profile:profiles!project_members_user_id_fkey(full_name, email)")
      .eq("project_id", projectId),
    db
      .from("task_comments")
      .select("*, author:profiles!task_comments_user_id_fkey(full_name), tasks!inner(project_id)")
      .eq("tasks.project_id", projectId)
      .order("created_at"),
    canManage ? db.rpc("staff_allocation") : Promise.resolve({ data: [] }),
  ]);

  const tasks: TaskRow[] = (tasksRes.data ?? []).map((t) => ({
    ...t,
    assignee_name: (t.assignee as { full_name: string } | null)?.full_name ?? null,
  }));
  const members: MemberRow[] = (membersRes.data ?? []).map((m) => {
    const profile = m.profile as unknown as { full_name: string; email: string } | null;
    return {
      user_id: m.user_id,
      full_name: profile?.full_name ?? "Unknown",
      email: profile?.email ?? "",
    };
  });
  const comments: CommentRow[] = (commentsRes.data ?? []).map((c) => ({
    id: c.id,
    task_id: c.task_id,
    user_id: c.user_id,
    body: c.body,
    created_at: c.created_at,
    user_name: (c.author as { full_name: string } | null)?.full_name ?? "Unknown",
  }));

  return (
    <div>
      <RealtimeRefresher
        channel={`project:${projectId}:tasks`}
        table="tasks"
        filter={`project_id=eq.${projectId}`}
      />
      <RealtimeRefresher
        channel={`project:${projectId}:milestones`}
        table="project_milestones"
        filter={`project_id=eq.${projectId}`}
      />
      <ProjectHeader
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status as ProjectStatus,
          deadline: project.deadline,
          amount: Number(project.amount),
          sort_order: project.sort_order,
          is_archived: project.is_archived,
        }}
        clientName={(project.clients as { name: string } | null)?.name ?? null}
        ownerName={(project.owner as { full_name: string } | null)?.full_name ?? "Unknown"}
        canManage={canManage}
        canMarkPaid={canMarkPaid}
        canArchive={can(auth, "projects", "write")}
      />
      <ProjectDetail
        projectId={projectId}
        ownerName={(project.owner as { full_name: string } | null)?.full_name ?? "Unknown"}
        tasks={tasks}
        milestones={(milestonesRes.data ?? []) as ProjectMilestone[]}
        members={members}
        comments={comments}
        allocation={(allocationRes.data ?? []) as AllocationRow[]}
        meId={auth.userId}
        canManage={canManage}
        canMarkPaid={canMarkPaid}
      />
    </div>
  );
}
