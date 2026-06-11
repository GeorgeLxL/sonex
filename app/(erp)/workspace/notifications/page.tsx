import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { NotificationsList } from "@/components/notifications-list";
import type { Notification } from "@/types";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireAuth();
  const db = await supabaseServer();
  const { data } = await db
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Notifications"
        sub="Everything addressed to you - tasks, projects, leave, payslips and announcements."
      />
      <NotificationsList items={(data ?? []) as Notification[]} />
    </div>
  );
}
