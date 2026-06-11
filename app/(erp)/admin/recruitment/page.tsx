import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm, can } from "@/lib/auth";
import { ENTITIES } from "@/lib/admin-entities";
import { CrudPanel, type Row } from "@/components/admin/crud-panel";
import { TabNav } from "@/components/admin/tab-nav";
import { PageTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Recruitment" };

const TABS = [
  { key: "candidates", label: "Candidates" },
  { key: "job_posts", label: "Job posts" },
];

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await requirePerm("recruitment", "read");
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "candidates";
  const db = await supabaseServer();
  const canWrite = can(auth, "recruitment", "write");

  let body: React.ReactNode;
  if (tab === "job_posts") {
    const { data } = await db.from("job_posts").select("*").order("sort_order");
    body = (
      <CrudPanel
        entityKey="job_posts"
        entity={ENTITIES.job_posts}
        rows={(data ?? []) as Row[]}
        columns={[
          { key: "title", label: "Title" },
          { key: "department", label: "Department" },
          { key: "location", label: "Location" },
          { key: "employment_type", label: "Type" },
          { key: "is_open", label: "Open" },
        ]}
        canWrite={canWrite}
      />
    );
  } else {
    const { data } = await db
      .from("candidates")
      .select("*, job_posts(title)")
      .order("created_at", { ascending: false });
    const rows = (data ?? []).map((c) => ({
      ...c,
      job_title: (c.job_posts as { title: string } | null)?.title ?? "—",
    })) as Row[];
    body = (
      <CrudPanel
        entityKey="candidates"
        entity={ENTITIES.candidates}
        rows={rows}
        columns={[
          { key: "name", label: "Candidate" },
          { key: "job_title", label: "Position" },
          { key: "status", label: "Status" },
          { key: "note", label: "Note" },
        ]}
        canWrite={canWrite}
        canCreate={false}
        extra={Object.fromEntries(
          rows.map((row) => [
            row.id,
            <div key={row.id} className="mt-1 space-y-0.5 text-xs text-muted">
              <div>{String(row.email ?? "")}{row.phone ? ` · ${row.phone}` : ""}</div>
              {typeof row.resume_url === "string" && row.resume_url && (
                <a href={row.resume_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  Resume / portfolio
                </a>
              )}
              {typeof row.cover_letter === "string" && row.cover_letter && (
                <div className="max-w-md whitespace-pre-wrap">{row.cover_letter}</div>
              )}
              <div>applied {formatDateTime(String(row.created_at))}</div>
            </div>,
          ]),
        )}
      />
    );
  }

  return (
    <div>
      <PageTitle title="Recruitment" sub="Job posts feed the public careers page; applications land here." />
      <TabNav base="/admin/recruitment" tabs={TABS} active={tab} />
      {body}
    </div>
  );
}
