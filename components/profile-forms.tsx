"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Card, Textarea, FileInput } from "@/components/ui";
import { updateMyProfile, changeMyPassword } from "@/server/actions/profile";
import { TIMEZONES } from "@/lib/timezones";
import { initials } from "@/lib/utils";
import type { Profile } from "@/types";

export function ProfileForms({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-4 text-sm font-semibold">Profile</h2>
        <form
          action={async (formData: FormData) => {
            const result = await updateMyProfile(formData);
            setMsg(
              result.ok
                ? { ok: true, text: "Profile saved." }
                : { ok: false, text: result.error ?? "Failed" },
            );
            if (result.ok) router.refresh();
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent">
                {initials(profile.full_name)}
              </span>
            )}
            <div className="flex-1">
              <Label>Avatar (JPG/PNG/WebP, max 1 MB)</Label>
              <FileInput name="avatar" accept="image/jpeg,image/png,image/webp" label="Choose image" />
            </div>
          </div>
          <div>
            <Label>Full name</Label>
            <Input name="full_name" defaultValue={profile.full_name} required maxLength={200} />
          </div>
          <div>
            <Label>Bio (shown on the public About page for CEO/CTO)</Label>
            <Textarea name="bio" rows={3} maxLength={1000} defaultValue={profile.bio} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={profile.email} disabled />
            <p className="mt-1 text-xs text-muted">Email is managed by your administrator.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Phone</Label>
              <Input name="phone" defaultValue={profile.phone ?? ""} maxLength={50} />
            </div>
            <div>
              <Label>Birthday</Label>
              <Input name="birthday" type="date" defaultValue={profile.birthday ?? ""} />
            </div>
          </div>
          <div>
            <Label>Timezone</Label>
            <Select name="timezone" defaultValue={profile.timezone}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
          <Button type="submit">Save profile</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">Change password</h2>
        <form
          action={async (formData: FormData) => {
            const result = await changeMyPassword({ password: formData.get("password") });
            setPwMsg(
              result.ok
                ? { ok: true, text: "Password changed." }
                : { ok: false, text: result.error ?? "Failed" },
            );
          }}
          className="space-y-4"
        >
          <div>
            <Label>New password</Label>
            <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.ok ? "text-success" : "text-danger"}`}>{pwMsg.text}</p>
          )}
          <Button type="submit" variant="secondary">
            Change password
          </Button>
        </form>
      </Card>
    </div>
  );
}
