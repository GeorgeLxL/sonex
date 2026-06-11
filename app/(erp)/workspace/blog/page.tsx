import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { BlogManager, type MyPost } from "@/components/blog/blog-manager";

export const metadata: Metadata = { title: "My blog posts" };

export default async function WorkspaceBlogPage() {
  const auth = await requireAuth();
  const db = await supabaseServer();
  const { data } = await db
    .from("blog_posts")
    .select("id, slug, title, excerpt, body, cover_url, approval_status, review_note, published_at")
    .eq("author_id", auth.userId)
    .order("published_at", { ascending: false });

  return (
    <div>
      <PageTitle
        title="My blog posts"
        sub="Published posts appear on the public site under your name."
      />
      <BlogManager posts={(data ?? []) as MyPost[]} />
    </div>
  );
}
