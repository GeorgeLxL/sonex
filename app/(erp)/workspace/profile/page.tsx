import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { ProfileForms } from "@/components/profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const auth = await requireAuth();
  return (
    <div>
      <PageTitle title="Profile" sub={`Signed in as ${auth.roleDisplay}`} />
      <ProfileForms profile={auth.profile} />
    </div>
  );
}
