import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { Section } from "@/components/public/sections";
import { formatDateHuman } from "@/lib/dates";
import { initials } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = await supabaseServer();
  const { data } = await db
    .from("blog_posts")
    .select("title, excerpt, cover_url")
    .eq("slug", slug)
    .eq("approval_status", "approved")
    .maybeSingle();
  if (!data) return { title: "Blog" };
  return {
    title: data.title,
    description: data.excerpt,
    openGraph: data.cover_url ? { images: [data.cover_url] } : undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await supabaseServer();
  const { data: post } = await db
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("approval_status", "approved")
    .maybeSingle();
  if (!post) notFound();

  const paragraphs = post.body.split(/\n{2,}/).filter((p: string) => p.trim());

  return (
    <article>
      {post.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_url} alt="" className="max-h-[420px] w-full object-cover" />
      )}
      <Section>
        <div className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft size={14} /> All posts
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{post.title}</h1>
          <div className="mt-5 flex items-center gap-3 border-b border-line pb-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {initials(post.author_name)}
            </span>
            <div>
              <div className="text-sm font-medium">{post.author_name}</div>
              <time className="text-xs text-muted">
                {formatDateHuman(post.published_at?.slice(0, 10))}
              </time>
            </div>
          </div>
          <div className="mt-8 space-y-5">
            {paragraphs.map((p: string, i: number) => (
              <p key={i} className="leading-relaxed text-ink/90">
                {p}
              </p>
            ))}
          </div>
        </div>
      </Section>
    </article>
  );
}
