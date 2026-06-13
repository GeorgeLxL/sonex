import type { Metadata } from "next";
import { CheckCircle2, MapPin, Briefcase } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text, list } from "@/lib/content";
import { Section, SectionTitle } from "@/components/public/sections";
import { PageHero } from "@/components/public/page-hero";
import { ApplicationForm } from "@/components/public/forms";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join Sonex-Digital — open positions, benefits and our hiring process.",
};

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
        <div className="grid gap-px border border-accent/15 bg-accent/15 sm:grid-cols-2 lg:grid-cols-3">
          {list<string>(content, "careers.benefits", "benefits").map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-bg p-5 transition-colors hover:bg-surface-2">
              <CheckCircle2 size={16} className="shrink-0 text-accent" strokeWidth={1.5} />
              <span className="text-sm font-light text-ink/80">{b}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionTitle kicker="Open positions" title={openJobs.length ? "We're hiring" : "No open positions right now"} sub={openJobs.length ? undefined : "Check back soon, or send a speculative application via the contact page."} />
        <div className="border border-accent/15">
          {openJobs.map((j) => (
            <article key={j.id} className="border-b border-accent/15 p-7 transition-colors last:border-b-0 hover:bg-surface-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-medium">{j.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-accent">
                    <span className="inline-flex items-center gap-1.5"><Briefcase size={13} /> {j.department} · {j.employment_type}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {j.location}</span>
                    {j.salary_range && <span>{j.salary_range}</span>}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm font-light leading-relaxed text-ink/80">{j.description}</p>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted"><span className="font-normal text-accent">Requirements:</span> {j.requirements}</p>
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
              <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center border border-accent/30 bg-bg font-mono text-xs text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="pt-1.5 lg:mt-3 lg:pt-0">
                <div className="text-sm font-light text-ink/80">{s}</div>
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
