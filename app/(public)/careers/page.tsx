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
      <PageHero title="Careers" sub={text(content, "careers.why", "body")} />

      <Section tint>
        <SectionTitle kicker="Benefits" title="What you get" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list<string>(content, "careers.benefits", "benefits").map((b, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4">
              <CheckCircle2 size={18} className="shrink-0 text-success" />
              <span className="text-sm">{b}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionTitle kicker="Open positions" title={openJobs.length ? "We're hiring" : "No open positions right now"} sub={openJobs.length ? undefined : "Check back soon, or send a speculative application via the contact page."} />
        <div className="space-y-4">
          {openJobs.map((j) => (
            <article key={j.id} className="rounded-lg border border-line bg-surface p-6">
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
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {list<string>(content, "careers.process", "steps").map((s, i) => (
            <li key={i} className="rounded-lg border border-line bg-surface p-4">
              <div className="text-xs font-bold text-accent">STEP {i + 1}</div>
              <div className="mt-1 text-sm font-medium">{s}</div>
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
