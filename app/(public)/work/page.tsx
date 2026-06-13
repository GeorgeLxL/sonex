import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Section, CtaBand } from "@/components/public/sections";
import { WorkCard, type WorkCardData } from "@/components/public/work-card";
import { PageHero } from "@/components/public/page-hero";

export const metadata: Metadata = {
  title: "Work",
  description: "Products we designed, built and shipped — case studies across web, mobile, ERP and AI.",
};

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const db = await supabaseServer();
  const { data: all } = await db
    .from("case_studies")
    .select("id, slug, title, summary, body, cover_url, services(slug, title)")
    .eq("is_published", true)
    .order("sort_order");

  const works = (all ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    body: c.body,
    cover_url: c.cover_url,
    service_slug:
      (c.services as unknown as { slug: string; title: string } | null)?.slug ?? null,
    service_title:
      (c.services as unknown as { slug: string; title: string } | null)?.title ?? null,
  }));

  const serviceFilters = Array.from(
    new Map(
      works
        .filter((w) => w.service_slug)
        .map((w) => [w.service_slug as string, w.service_title as string]),
    ).entries(),
  );
  const filtered = service ? works.filter((w) => w.service_slug === service) : works;

  return (
    <>
      <PageHero title="Our work" sub="Products we designed, built and shipped." bg='work' />

      <Section>
        <div className="mb-10 flex flex-wrap gap-2">
          <Link
            href="/work"
            className={`border px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.1em] transition-colors ${!service ? "border-accent bg-accent text-accent-ink" : "border-accent/25 text-muted hover:border-accent/60 hover:text-accent"}`}
          >
            All
          </Link>
          {serviceFilters.map(([slug, title]) => (
            <Link
              key={slug}
              href={`/work?service=${encodeURIComponent(slug)}`}
              className={`border px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.1em] transition-colors ${service === slug ? "border-accent bg-accent text-accent-ink" : "border-accent/25 text-muted hover:border-accent/60 hover:text-accent"}`}
            >
              {title}
            </Link>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-px border border-accent/15 bg-accent/15">
            {filtered.map((w) => (
              <WorkCard key={w.id} work={w as WorkCardData} />
            ))}
          </div>
        ) : (
          <p className="text-sm font-light text-muted">No case studies for this service yet.</p>
        )}
      </Section>

      <CtaBand
        title="Want results like these?"
        body="Tell us about your product and we will map a plan together."
        button="Start a project"
      />
    </>
  );
}
