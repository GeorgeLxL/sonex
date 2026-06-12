import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Section } from "@/components/public/sections";
import { PageHero } from "@/components/public/page-hero";
import { formatDateHuman } from "@/lib/dates";

export const metadata: Metadata = { title: "Blog" };

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
      {(posts ?? []).length === 0 && (
        <p className="text-sm text-muted">No posts yet — check back soon.</p>
      )}

      <div className="gap-4 max-w-5xl mx-auto">
        {(posts ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="group block sm:flex mb-5 overflow-hidden rounded border border-line/60 bg-surface shadow-md shadow-black/5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10"
          >
            {p.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.cover_url}
                alt=""
                className="h-32 w-full sm:w-32 shrink-0 object-cover transition-transform group-hover:scale-[1.02]"
              />
            ) : (
              <div className="h-36 w-36 shrink-0 items-center justify-center bg-surface-2 text-4xl font-black text-line">
                SX
              </div>
            )}
            <div className="p-3 pr-8 w-full flex flex-col">
              <h3 className="font-semibold group-hover:text-accent">{p.title}</h3>
              <p className="mt-2 mb-4 line-clamp-2 text-sm text-muted">{p.excerpt}</p>
              <div className="mt-auto flex items-center justify-between text-xs text-muted">
                <span>{p.author_name}</span>
                <time>{formatDateHuman(p.published_at?.slice(0, 10))}</time>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Section>
    </>
  );
}
