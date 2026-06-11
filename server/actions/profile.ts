"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { TIMEZONES } from "@/lib/timezones";
import type { ActionResult } from "@/server/actions/projects";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name required").max(200),
  phone: z.string().trim().max(50).nullable().default(null),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  timezone: z.string().refine((t) => TIMEZONES.includes(t), "Unknown timezone"),
  bio: z.string().trim().max(1000).default(""),
});

const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function updateMyProfile(formData: FormData): Promise<ActionResult> {
  const auth = await requireAuth();
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: (formData.get("phone") as string) || null,
    birthday: (formData.get("birthday") as string) || null,
    timezone: formData.get("timezone"),
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const patch: Record<string, unknown> = { ...parsed.data };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const ext = AVATAR_TYPES[avatar.type];
    if (!ext) return { ok: false, error: "Avatar must be a JPG, PNG or WebP image" };
    if (avatar.size > 1024 * 1024) return { ok: false, error: "Avatar must be under 1 MB" };
    const admin = supabaseAdmin();
    // Random suffix busts browser caches when the avatar changes.
    const path = `avatars/${auth.userId}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await admin.storage
      .from("media")
      .upload(path, avatar, { contentType: avatar.type });
    if (error) return { ok: false, error: `Avatar upload failed: ${error.message}` };
    patch.avatar_url = admin.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  const db = await supabaseServer();
  const { error } = await db.from("profiles").update(patch).eq("id", auth.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/workspace/profile");
  revalidatePath("/about");
  return { ok: true };
}

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function changeMyPassword(input: unknown): Promise<ActionResult> {
  await requireAuth();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const db = await supabaseServer();
  const { error } = await db.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
