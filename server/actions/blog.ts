"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth, can } from "@/lib/auth";

export interface BlogActionResult {
  ok: boolean;
  error?: string;
}

function fail(error: string): BlogActionResult {
  return { ok: false, error };
}

function revalidateBlog() {
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/workspace/blog");
  revalidatePath("/admin/website");
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : suffix;
}

const postSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(300),
  body: z.string().trim().min(1, "Content required").max(50000),
  excerpt: z.string().trim().max(500).default(""),
  submit: z.boolean().default(true),
});

const MAX_BANNER_BYTES = 1024 * 1024; // Next server-action body limit is 1 MB
const BANNER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function uploadBanner(file: File): Promise<{ url?: string; error?: string }> {
  const ext = BANNER_TYPES[file.type];
  if (!ext) return { error: "Banner must be a JPG, PNG or WebP image" };
  if (file.size > MAX_BANNER_BYTES) return { error: "Banner must be under 1 MB - compress the image and retry" };

  const admin = supabaseAdmin();
  const path = `blog/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from("media")
    .upload(path, file, { contentType: file.type });
  if (error) return { error: `Upload failed: ${error.message}` };
  return { url: admin.storage.from("media").getPublicUrl(path).data.publicUrl };
}

/** Tell the super admin(s) a post is waiting for review. */
async function notifyReviewers(authorName: string, title: string) {
  const db = await supabaseServer();
  const { data: admins } = await db
    .from("profiles")
    .select("id, roles!inner(name)")
    .eq("is_active", true)
    .eq("roles.name", "coo");
  for (const a of admins ?? []) {
    await db.rpc("notify_user", {
      p_user: a.id,
      p_type: "blog_pending",
      p_title: "Blog post awaiting review",
      p_body: `${authorName}: "${title}"`,
      p_link: "/admin/website?tab=blog_posts",
    });
  }
}

export async function createPost(formData: FormData): Promise<BlogActionResult> {
  const auth = await requireAuth();
  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    excerpt: formData.get("excerpt") ?? "",
    submit: formData.get("submit") === "on",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  let coverUrl: string | null = null;
  const banner = formData.get("banner");
  if (banner instanceof File && banner.size > 0) {
    const uploaded = await uploadBanner(banner);
    if (uploaded.error) return fail(uploaded.error);
    coverUrl = uploaded.url ?? null;
  }

  // Super admin posts go live directly; everyone else goes to review.
  const isAdmin = can(auth, "website", "write");
  const status = parsed.data.submit ? (isAdmin ? "approved" : "pending") : "draft";

  const db = await supabaseServer();
  const excerpt =
    parsed.data.excerpt || parsed.data.body.replace(/\s+/g, " ").slice(0, 180).trim();
  const { error } = await db.from("blog_posts").insert({
    slug: slugify(parsed.data.title),
    title: parsed.data.title,
    body: parsed.data.body,
    excerpt,
    cover_url: coverUrl,
    author_id: auth.userId,
    author_name: auth.profile.full_name,
    is_published: status === "approved",
    approval_status: status,
  });
  if (error) return fail(error.message);

  if (status === "pending") await notifyReviewers(auth.profile.full_name, parsed.data.title);
  revalidateBlog();
  return { ok: true };
}

export async function updatePost(postId: string, formData: FormData): Promise<BlogActionResult> {
  const auth = await requireAuth();
  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    excerpt: formData.get("excerpt") ?? "",
    submit: formData.get("submit") === "on",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = await supabaseServer();
  const { data: post } = await db
    .from("blog_posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  if (!post) return fail("Post not found");
  const isAdmin = can(auth, "website", "write");
  if (post.author_id !== auth.userId && !isAdmin) {
    return fail("You can only edit your own posts");
  }

  // Any edit re-enters the flow: draft, or pending review (admins: live).
  const status = parsed.data.submit ? (isAdmin ? "approved" : "pending") : "draft";

  const patch: Record<string, unknown> = {
    title: parsed.data.title,
    body: parsed.data.body,
    excerpt:
      parsed.data.excerpt || parsed.data.body.replace(/\s+/g, " ").slice(0, 180).trim(),
    is_published: status === "approved",
    approval_status: status,
    review_note: null,
  };

  const banner = formData.get("banner");
  if (banner instanceof File && banner.size > 0) {
    const uploaded = await uploadBanner(banner);
    if (uploaded.error) return fail(uploaded.error);
    patch.cover_url = uploaded.url;
  }

  const { error } = await db.from("blog_posts").update(patch).eq("id", postId);
  if (error) return fail(error.message);

  if (status === "pending") await notifyReviewers(auth.profile.full_name, parsed.data.title);
  revalidateBlog();
  return { ok: true };
}

/** Super admin review: approve makes the post public; reject returns it
 *  to the author with an optional note. */
export async function reviewPost(
  postId: string,
  approve: boolean,
  note?: string,
): Promise<BlogActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "website", "write")) return fail("Only the super admin can review posts");

  const db = await supabaseServer();
  const { data: post } = await db
    .from("blog_posts")
    .select("author_id, title")
    .eq("id", postId)
    .single();
  if (!post) return fail("Post not found");

  const { error } = await db
    .from("blog_posts")
    .update({
      approval_status: approve ? "approved" : "rejected",
      is_published: approve,
      review_note: approve ? null : (note?.trim() || null),
      ...(approve ? { published_at: new Date().toISOString() } : {}),
    })
    .eq("id", postId);
  if (error) return fail(error.message);

  if (post.author_id && post.author_id !== auth.userId) {
    await db.rpc("notify_user", {
      p_user: post.author_id,
      p_type: "blog_reviewed",
      p_title: approve ? "Blog post approved" : "Blog post rejected",
      p_body: `"${post.title}"${!approve && note ? ` - ${note}` : ""}`,
      p_link: "/workspace/blog",
    });
  }
  revalidateBlog();
  return { ok: true };
}

export async function deletePost(postId: string): Promise<BlogActionResult> {
  const auth = await requireAuth();
  const db = await supabaseServer();
  const { data: post } = await db
    .from("blog_posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  if (!post) return fail("Post not found");
  if (post.author_id !== auth.userId && !can(auth, "website", "write")) {
    return fail("You can only delete your own posts");
  }
  const { error } = await db.from("blog_posts").delete().eq("id", postId);
  if (error) return fail(error.message);
  revalidateBlog();
  return { ok: true };
}
