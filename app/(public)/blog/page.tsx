import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { Section } from "@/components/public/sections";
import { PageHero } from "@/components/public/page-hero";
import { formatDateHuman } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Blog",
  description: "Engineering notes, product thinking and stories from the Sonex-Digital team.",
};

export default async function BlogPage() {
  const db = await supabaseServer();
  const { data: posts } = await db
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_url, author_name, published_at")
    .eq("approval_status", "approved")
    .order("published_at", { ascending: false });

  return (
    <>
    <PageHero title="Blog" sub="Engineering notes, product thinking and stories from the team." bg='blog' />
    <Section>
      {(posts ?? []).length === 0 ? (
        <p className="text-sm font-light text-muted">No posts yet — check back soon.</p>
      ) : (
        <div className="grid gap-px border border-accent/15 bg-accent/15 sm:grid-cols-2 lg:grid-cols-3">
          {(posts ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group flex flex-col bg-bg p-7 transition-colors hover:bg-surface-2"
            >
              <div className="mb-5 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.15em]">
                <span className="text-accent">{p.author_name}</span>
                <time className="text-muted">{formatDateHuman(p.published_at?.slice(0, 10))}</time>
              </div>
              <h3 className="font-display text-lg font-medium leading-snug transition-colors group-hover:text-accent">{p.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm font-light leading-relaxed text-muted">{p.excerpt}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
                Read article <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </Section>
    </>
  );
}
