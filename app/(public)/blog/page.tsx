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
    <PageHero title="Blog" sub="Engineering notes, product thinking and stories from the team." />
    <Section>
      {(posts ?? []).length === 0 && (
        <p className="text-sm text-muted">No posts yet — check back soon.</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(posts ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="group overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-accent"
          >
            {p.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.cover_url}
                alt=""
                className="h-44 w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-44 w-full items-center justify-center bg-surface-2 text-4xl font-black text-line">
                SX
              </div>
            )}
            <div className="p-5">
              <h2 className="font-semibold group-hover:text-accent">{p.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{p.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted">
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
