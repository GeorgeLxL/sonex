import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm, can } from "@/lib/auth";
import { ENTITIES } from "@/lib/admin-entities";
import { CrudPanel, type Row } from "@/components/admin/crud-panel";
import { PageTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const auth = await requirePerm("announcements", "write");
  const db = await supabaseServer();

  const { data } = await db
    .from("announcements")
    .select("*, profiles!announcements_created_by_fkey(full_name)")
    .order("published_at", { ascending: false });

  const rows = (data ?? []).map((a) => ({
    ...a,
    author: (a.profiles as { full_name: string } | null)?.full_name ?? "—",
    published: formatDateTime(a.published_at),
  })) as Row[];

  return (
    <div>
      <PageTitle
        title="Announcements"
        sub="Shown to every staff member on their workspace dashboard (newest first)."
      />
      <CrudPanel
        entityKey="announcements"
        entity={ENTITIES.announcements}
        rows={rows}
        columns={[
          { key: "title", label: "Title" },
          { key: "body", label: "Body" },
          { key: "author", label: "By" },
          { key: "published", label: "Published" },
        ]}
        canWrite={can(auth, "announcements", "write")}
      />
    </div>
  );
}
