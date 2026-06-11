import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm, can } from "@/lib/auth";
import { ENTITIES } from "@/lib/admin-entities";
import { CrudPanel, type Row } from "@/components/admin/crud-panel";
import { TabNav } from "@/components/admin/tab-nav";
import { PageTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Clients" };

const TABS = [
  { key: "clients", label: "Clients" },
  { key: "inquiries", label: "Contact inquiries" },
];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await requirePerm("clients", "read");
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "clients";
  const db = await supabaseServer();
  const canWrite = can(auth, "clients", "write");

  let body: React.ReactNode;
  if (tab === "inquiries") {
    const { data } = await db
      .from("contact_inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Row[];
    body = (
      <CrudPanel
        entityKey="contact_inquiries"
        entity={ENTITIES.contact_inquiries}
        rows={rows}
        columns={[
          { key: "name", label: "From" },
          { key: "budget", label: "Budget" },
          { key: "status", label: "Status" },
        ]}
        canWrite={canWrite}
        canCreate={false}
        extra={Object.fromEntries(
          rows.map((row) => [
            row.id,
            <div key={row.id} className="mt-1 space-y-0.5 text-xs text-muted">
              <div>
                {String(row.email ?? "")}
                {row.company ? ` · ${row.company}` : ""}
              </div>
              <div className="max-w-md whitespace-pre-wrap">{String(row.message ?? "")}</div>
              <div>received {formatDateTime(String(row.created_at))}</div>
            </div>,
          ]),
        )}
      />
    );
  } else {
    const { data } = await db.from("clients").select("*").order("created_at", { ascending: false });
    body = (
      <CrudPanel
        entityKey="clients"
        entity={ENTITIES.clients}
        rows={(data ?? []) as Row[]}
        columns={[
          { key: "name", label: "Name" },
          { key: "company", label: "Company" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status" },
        ]}
        canWrite={canWrite}
      />
    );
  }

  return (
    <div>
      <PageTitle title="Clients" sub="CRM records and inbound inquiries." />
      <TabNav base="/admin/clients" tabs={TABS} active={tab} />
      {body}
    </div>
  );
}
