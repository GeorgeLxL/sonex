import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { Section, CtaBand } from "@/components/public/sections";
import { TechChips } from "@/components/public/tech-chip";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = await supabaseServer();
  const { data } = await db
    .from("case_studies")
    .select("title, summary, cover_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return { title: "Work" };
  return {
    title: data.title,
    description: data.summary,
    openGraph: data.cover_url ? { images: [data.cover_url] } : undefined,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await supabaseServer();
  const { data: work } = await db
    .from("case_studies")
    .select("*, services(slug, title)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!work) notFound();

  const service = work.services as { slug: string; title: string } | null;
  const paragraphs = (work.body as string).split(/\n{2,}/).filter((p) => p.trim());

  return (
    <>
      <Section>
        <div className="mx-auto max-w-4xl">
          <Link
            href="/work"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft size={14} /> All work
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-accent md:text-5xl">
            {work.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {service && (
              <Link
                href={`/services#${service.slug}`}
                className="rounded border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
              >
                {service.title}
              </Link>
            )}
            {work.client_name && (
              <span className="text-sm text-muted">for {work.client_name}</span>
            )}
          </div>

          {work.summary && (
            <p className="mt-5 text-lg font-medium text-muted">{work.summary}</p>
          )}

          {work.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={work.cover_url}
              alt={work.title}
              loading="lazy"
              decoding="async"
              className="mt-8 w-full rounded object-cover"
            />
          )}

          <div className="mt-8 space-y-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="leading-relaxed text-ink/90">
                {p}
              </p>
            ))}
          </div>

          {(work.technologies ?? []).length > 0 && (
            <div className="mt-10 border-t border-line pt-8">
              <h2 className="mb-4 text-lg font-bold">Technologies used</h2>
              <TechChips items={work.technologies as string[]} />
            </div>
          )}
        </div>
      </Section>

      <CtaBand
        title="Want a result like this?"
        body="Tell us about your product and we will map a plan together."
        button="Start a project"
      />
    </>
  );
}
