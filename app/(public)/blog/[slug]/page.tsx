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

          <h1 className="mt-5 font-display text-3xl font-medium tracking-tight md:text-5xl">
            {post.title}
          </h1>
          <time className="mt-4 block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
            {formatDateHuman(post.published_at?.slice(0, 10))}
          </time>

          {post.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover_url}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="mt-8 w-full border border-accent/15 object-cover"
            />
          )}

          <div className="mt-8 space-y-5">
            {paragraphs.map((p: string, i: number) => (
              <p key={i} className="font-light leading-relaxed text-ink/80">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-4 border-t border-accent/15 pt-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-accent/30 font-mono text-sm text-accent">
              {initials(post.author_name)}
            </span>
            <div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted">Written by</div>
              <div className="mt-0.5 font-display text-base font-medium">{post.author_name}</div>
            </div>
          </div>
        </div>
      </Section>
    </article>
  );
}
