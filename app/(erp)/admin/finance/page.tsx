import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm, can } from "@/lib/auth";
import { ENTITIES } from "@/lib/admin-entities";
import { CrudPanel, type Row } from "@/components/admin/crud-panel";
import { TabNav } from "@/components/admin/tab-nav";
import { PageTitle, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Finance" };

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
];

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await requirePerm("finance", "read");
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "overview";
  const db = await supabaseServer();
  const canWrite = can(auth, "finance", "write");

  if (tab === "overview") {
    const [projectsRes, milestonesRes, paymentsRes, expensesRes, invoicesRes] = await Promise.all([
      db.from("projects").select("status, amount").eq("is_archived", false),
      db.from("project_milestones").select("status, amount"),
      db.from("payments").select("amount"),
      db.from("expenses").select("amount"),
      db.from("invoices").select("status, amount"),
    ]);

    const projects = projectsRes.data ?? [];
    const milestones = milestonesRes.data ?? [];
    // Received money = Paid projects (whole) + Paid milestones of unpaid projects.
    const paidProjects = projects.filter((p) => p.status === "paid");
    const receivedFromBoard =
      paidProjects.reduce((s, p) => s + Number(p.amount), 0) +
      milestones.filter((m) => m.status === "paid").reduce((s, m) => s + Number(m.amount), 0);
    const outstanding = projects
      .filter((p) => p.status === "done")
      .reduce((s, p) => s + Number(p.amount), 0);
    const paymentsTotal = (paymentsRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const expensesTotal = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
    const unpaidInvoices = (invoicesRes.data ?? [])
      .filter((i) => i.status !== "paid")
      .reduce((s, i) => s + Number(i.amount), 0);

    const stats = [
      { label: "Received (Paid projects & milestones)", value: formatMoney(receivedFromBoard) },
      { label: "Done but not Paid (outstanding)", value: formatMoney(outstanding) },
      { label: "Payments recorded", value: formatMoney(paymentsTotal) },
      { label: "Unpaid invoices", value: formatMoney(unpaidInvoices) },
      { label: "Expenses", value: formatMoney(expensesTotal) },
      { label: "Net (payments − expenses)", value: formatMoney(paymentsTotal - expensesTotal) },
    ];

    return (
      <div>
        <PageTitle
          title="Finance"
          sub="Record-keeping only — real money moves outside the system."
        />
        <TabNav base="/admin/finance" tabs={TABS} active={tab} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="mt-0.5 text-xs text-muted">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const entity = ENTITIES[tab];
  const { data } = await db
    .from(entity.table)
    .select("*")
    .order(entity.orderBy ?? "created_at", { ascending: false });

  const columns =
    tab === "invoices"
      ? [
          { key: "number", label: "Invoice #" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status" },
          { key: "issued_date", label: "Issued" },
          { key: "due_date", label: "Due" },
        ]
      : tab === "payments"
        ? [
            { key: "amount", label: "Amount" },
            { key: "received_date", label: "Received" },
            { key: "method", label: "Method" },
            { key: "note", label: "Note" },
          ]
        : [
            { key: "category", label: "Category" },
            { key: "amount", label: "Amount" },
            { key: "spent_date", label: "Date" },
            { key: "description", label: "Description" },
          ];

  return (
    <div>
      <PageTitle title="Finance" sub="Record-keeping only — real money moves outside the system." />
      <TabNav base="/admin/finance" tabs={TABS} active={tab} />
      <CrudPanel
        entityKey={tab}
        entity={entity}
        rows={(data ?? []) as Row[]}
        columns={columns}
        canWrite={canWrite}
      />
    </div>
  );
}
