import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, User } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { PageTitle, Badge, Empty } from "@/components/ui";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types";
import { formatDateHuman, todayInTz } from "@/lib/dates";

export const metadata: Metadata = { title: "My projects" };

export default async function WorkspaceProjectsPage() {
  const auth = await requireAuth();
  const db = await supabaseServer();

  // RLS limits this to: owned projects, member projects, or all (projects.read).
  const { data } = await db
    .from("projects")
    .select("*, clients(name), owner:profiles!projects_owner_id_fkey(full_name)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  const projects = data ?? [];
  const today = todayInTz(auth.profile.timezone);

  return (
    <div>
      <PageTitle title="My projects" sub="Projects you own or belong to." />
      {projects.length === 0 && (
        <Empty>No projects yet — you will see projects here once an owner adds you.</Empty>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const status = p.status as ProjectStatus;
          const overdue = p.deadline && p.deadline < today && status !== "done" && status !== "paid";
          return (
            <Link
              key={p.id}
              href={`/workspace/projects/${p.id}`}
              className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-accent"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <Badge tone={status === "paid" ? "success" : status === "done" ? "accent" : "default"}>
                  {PROJECT_STATUS_LABEL[status]}
                </Badge>
              </div>
              {(p.clients as { name: string } | null)?.name && (
                <div className="mt-1 text-xs text-muted">{(p.clients as { name: string }).name}</div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <User size={12} />
                  {p.owner_id === auth.userId
                    ? "You (owner)"
                    : (p.owner as { full_name: string } | null)?.full_name}
                </span>
                {p.deadline && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} /> {formatDateHuman(p.deadline)}
                  </span>
                )}
                {overdue && <Badge tone="danger">Overdue</Badge>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
