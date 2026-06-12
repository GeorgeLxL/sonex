import type { Metadata } from "next";
import { CheckCircle2, MapPin, Briefcase } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text, list } from "@/lib/content";
import { Section, SectionTitle } from "@/components/public/sections";
import { PageHero } from "@/components/public/page-hero";
import { ApplicationForm } from "@/components/public/forms";

export const metadata: Metadata = { title: "Careers" };

export default async function CareersPage() {
  const db = await supabaseServer();
  const [content, jobs] = await Promise.all([
    getContent(["careers.why", "careers.benefits", "careers.process"]),
    db.from("job_posts").select("*").eq("is_open", true).order("sort_order"),
  ]);
  const openJobs = jobs.data ?? [];

  return (
    <>
      <PageHero title="Careers" sub={text(content, "careers.why", "body")} bg='careers' />

      <Section tint>
        <SectionTitle kicker="Benefits" title="What you get" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list<string>(content, "careers.benefits", "benefits").map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
            >
              <span className="inline-flex shrink-0 rounded bg-gradient-to-br from-accent/15 to-violet-500/15 p-2 text-accent">
                <CheckCircle2 size={16} />
              </span>
              <span className="text-sm font-medium">{b}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionTitle kicker="Open positions" title={openJobs.length ? "We're hiring" : "No open positions right now"} sub={openJobs.length ? undefined : "Check back soon, or send a speculative application via the contact page."} />
        <div className="space-y-4">
          {openJobs.map((j) => (
            <article key={j.id} className="rounded border border-line bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{j.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-1"><Briefcase size={14} /> {j.department} · {j.employment_type}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={14} /> {j.location}</span>
                    {j.salary_range && <span>{j.salary_range}</span>}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm">{j.description}</p>
              <p className="mt-2 text-sm text-muted"><span className="font-medium text-ink">Requirements:</span> {j.requirements}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section tint>
        <SectionTitle kicker="Process" title="Hiring process" />
        <ol className="relative space-y-0 lg:flex lg:gap-4">
          {list<string>(content, "careers.process", "steps").map((s, i, arr) => (
            <li key={i} className="relative flex flex-1 gap-4 pb-8 last:pb-0 lg:block lg:pb-0">
              {i < arr.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-px bg-line lg:left-10 lg:top-[17px] lg:h-px lg:w-[calc(100%-2.5rem)]"
                />
              )}
              <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-violet-500 text-sm font-bold text-white shadow-md shadow-accent/30">
                {i + 1}
              </span>
              <div className="pt-1.5 lg:mt-3 lg:pt-0">
                <div className="text-sm font-semibold">{s}</div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {openJobs.length > 0 && (
        <Section id="apply">
          <SectionTitle kicker="Apply" title="Application form" sub="Applications go straight to our hiring team." />
          <div className="max-w-2xl">
            <ApplicationForm jobs={openJobs.map((j) => ({ id: j.id, title: j.title }))} />
          </div>
        </Section>
      )}
    </>
  );
}
