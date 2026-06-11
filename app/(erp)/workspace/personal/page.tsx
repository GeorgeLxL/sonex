import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { getMyPersonalTasks } from "@/server/queries/personal";
import { PersonalBoard } from "@/components/personal/personal-board";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Personal todos" };

export default async function PersonalPage() {
  const auth = await requireAuth();
  const tasks = await getMyPersonalTasks(auth.profile.timezone);

  return (
    <div>
      <PageTitle
        title="Personal todos"
        sub="Private to you — nobody else can see these. Recurring todos reset daily."
      />
      <PersonalBoard tasks={tasks} timezone={auth.profile.timezone} />
    </div>
  );
}
