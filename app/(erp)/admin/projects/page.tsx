import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm, can } from "@/lib/auth";
import { PipelineBoard, type ProjectRow } from "@/components/projects/pipeline-board";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { PageTitle } from "@/components/ui";
import { ArchivedProjects } from "@/components/projects/archived-projects";

export const metadata: Metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  const auth = await requirePerm("projects", "read");
  const db = await supabaseServer();

  const [projectsRes, staffRes, clientsRes] = await Promise.all([
    db
      .from("projects")
      .select("*, clients(name), owner:profiles!projects_owner_id_fkey(full_name)")
      .order("sort_order"),
    db.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    db.from("clients").select("id, name, company").order("name"),
  ]);

  const all = (projectsRes.data ?? []).map(
    (p): ProjectRow => ({
      ...p,
      amount: Number(p.amount),
      client_name: (p.clients as { name: string } | null)?.name ?? null,
      owner_name: (p.owner as { full_name: string } | null)?.full_name ?? "Unknown",
    }),
  );
  const active = all.filter((p) => !p.is_archived);
  const archived = all.filter((p) => p.is_archived);
  const canWrite = can(auth, "projects", "write");

  return (
    <div>
      <RealtimeRefresher channel="admin:projects" table="projects" />
      <PageTitle
        title="Projects"
        sub="Drag projects through the pipeline. Paid is CTO/COO only."
      />
      <PipelineBoard
        projects={active}
        canMarkPaid={can(auth, "projects.mark_paid", "write")}
        canCreate={canWrite}
        detailBase="/admin/projects"
        staff={staffRes.data ?? []}
        clients={clientsRes.data ?? []}
      />
      {canWrite && archived.length > 0 && <ArchivedProjects projects={archived} />}
    </div>
  );
}
