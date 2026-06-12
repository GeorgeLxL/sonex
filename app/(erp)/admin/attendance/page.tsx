import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm, can } from "@/lib/auth";
import { todayInTz } from "@/lib/dates";
import { PageTitle, Badge, Card, Empty } from "@/components/ui";
import { LeaveReview, type LeaveReviewRow, type LeaveTypeRow } from "@/components/admin/leave-review";
import { CrudPanel, type Row } from "@/components/admin/crud-panel";
import { ENTITIES } from "@/lib/admin-entities";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Attendance" };

export default async function AdminAttendancePage() {
  const auth = await requirePerm("attendance", "read");
  const db = await supabaseServer();
  const today = todayInTz(auth.profile.timezone);

  const [staffRes, todayRes, leavesRes, typesRes] = await Promise.all([
    db.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    db.from("attendance_logs").select("*").eq("work_date", today),
    db
      .from("leave_requests")
      .select("*, profiles!leave_requests_user_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("leave_types").select("*").order("sort_order"),
  ]);

  const staff = staffRes.data ?? [];
  const todayLogs = new Map((todayRes.data ?? []).map((l) => [l.user_id, l]));
  const leaves: LeaveReviewRow[] = (leavesRes.data ?? []).map((l) => ({
    id: l.id,
    user_id: l.user_id,
    user_name: (l.profiles as { full_name: string } | null)?.full_name ?? "Unknown",
    start_date: l.start_date,
    end_date: l.end_date,
    type: l.type,
    is_paid: l.is_paid,
    early_time: l.early_time ?? null,
    reason: l.reason,
    status: l.status,
  }));

  const checkedIn = staff.filter((s) => todayLogs.get(s.id)?.check_in).length;

  return (
    <div>
      <PageTitle title="Attendance" sub={`Team status for ${today} and leave approvals.`} />

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">
          Today — {checkedIn}/{staff.length} checked in
        </h2>
        {staff.length === 0 && <Empty>No active staff.</Empty>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => {
            const log = todayLogs.get(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between rounded border border-line p-2.5 text-sm">
                <span className="font-medium">{s.full_name}</span>
                {log?.check_in ? (
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {formatDateTime(log.check_in)}
                    <Badge tone={log.status === "late" ? "warning" : "success"}>{log.status}</Badge>
                  </span>
                ) : (
                  <Badge>not in</Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <LeaveReview
        leaves={leaves}
        staff={staff}
        leaveTypes={(typesRes.data ?? []) as LeaveTypeRow[]}
        canWrite={can(auth, "attendance", "write")}
      />

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold">Leave reasons</h2>
        <p className="mb-3 text-xs text-muted">
          The catalog staff pick from when requesting leave. Paid/unpaid here is
          the default - approvers can still override it per request. Reasons in
          use cannot be deleted; renaming updates existing records.
        </p>
        <CrudPanel
          entityKey="leave_types"
          entity={ENTITIES.leave_types}
          rows={(typesRes.data ?? []) as Row[]}
          columns={[
            { key: "name", label: "Reason" },
            { key: "is_paid", label: "Paid default" },
            { key: "requires_time", label: "Needs time" },
            { key: "single_day", label: "Single day" },
            { key: "sort_order", label: "Order" },
          ]}
          canWrite={can(auth, "attendance", "write")}
        />
      </section>
    </div>
  );
}
