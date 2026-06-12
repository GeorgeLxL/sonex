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
      <Section>
        <div className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft size={14} /> All posts
          </Link>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-accent md:text-5xl">
            {post.title}
          </h1>
          <time className="mt-3 block text-sm text-muted">
            {formatDateHuman(post.published_at?.slice(0, 10))}
          </time>

          {post.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover_url}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="mt-8 w-full rounded object-cover"
            />
          )}

          <div className="mt-8 space-y-5">
            {paragraphs.map((p: string, i: number) => (
              <p key={i} className="leading-relaxed text-ink/90">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3 border-t border-line pt-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-violet-500 text-sm font-bold text-white">
              {initials(post.author_name)}
            </span>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Written by</div>
              <div className="text-sm font-semibold">{post.author_name}</div>
            </div>
          </div>
        </div>
      </Section>
    </article>
  );
}
