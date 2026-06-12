import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { todayInTz } from "@/lib/dates";
import { PageTitle } from "@/components/ui";
import { AttendancePanel, type AttendanceRow, type LeaveRow, type LeaveTypeRow } from "@/components/attendance/attendance-panel";

export const metadata: Metadata = { title: "Attendance" };

export default async function WorkspaceAttendancePage() {
  const auth = await requireAuth();
  const db = await supabaseServer();
  const today = todayInTz(auth.profile.timezone);

  const [logsRes, leavesRes, typesRes] = await Promise.all([
    db
      .from("attendance_logs")
      .select("*")
      .eq("user_id", auth.userId)
      .order("work_date", { ascending: false })
      .limit(30),
    db
      .from("leave_requests")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(20),
    db.from("leave_types").select("name, is_paid, requires_time, single_day").order("sort_order"),
  ]);

  const logs = (logsRes.data ?? []) as AttendanceRow[];
  const todayLog = logs.find((l) => l.work_date === today) ?? null;

  return (
    <div>
      <PageTitle title="Attendance" sub="Check in when you start, out when you finish." />
      <AttendancePanel
        todayLog={todayLog}
        logs={logs}
        leaves={(leavesRes.data ?? []) as LeaveRow[]}
        leaveTypes={(typesRes.data ?? []) as LeaveTypeRow[]}
        workStart={auth.profile.work_start ?? "09:00"}
        workEnd={auth.profile.work_end ?? "18:00"}
        timezone={auth.profile.timezone}
      />
    </div>
  );
}
