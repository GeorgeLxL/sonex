import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, list } from "@/lib/content";
import { Section, SectionTitle, CtaBand } from "@/components/public/sections";
import { IconByName } from "@/components/icon-map";
import { TechChips } from "@/components/public/tech-chip";
import { PageHero } from "@/components/public/page-hero";

export const metadata: Metadata = { title: "Services" };

interface ProcessStep {
  title: string;
  body: string;
}

export default async function ServicesPage() {
  const db = await supabaseServer();
  const [content, services, capabilities] = await Promise.all([
    getContent(["services.process", "home.cta1"]),
    db.from("services").select("*").eq("is_published", true).order("sort_order"),
    db.from("capabilities").select("*").eq("is_published", true).order("sort_order"),
  ]);
  const steps = list<ProcessStep>(content, "services.process", "steps");

  return (
    <>
      <PageHero
        title="Services"
        sub="Six disciplines, one senior team. Every engagement ships production software."
      />

      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(services.data ?? []).map((s) => (
            <a key={s.id} href={`#${s.slug}`} className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent">
              <span className="inline-flex rounded-xl bg-ink p-2.5 text-bg">
                <IconByName name={s.icon} size={20} />
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.summary}</p>
            </a>
          ))}
        </div>
      </Section>

      {/* Detailed sections — one rich block per service */}
      {(services.data ?? []).map((s, i) => (
        <Section key={s.id} tint={i % 2 === 0} id={s.slug}>
          <div className="scroll-mt-24">
            <div className="flex items-center gap-4">
              <span className="inline-flex rounded-2xl bg-ink p-3.5 text-bg">
                <IconByName name={s.icon} size={28} />
              </span>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{s.title}</h2>
            </div>

            <p className="mt-5 max-w-4xl text-muted">{s.description}</p>

            {(s.offerings ?? []).length > 0 && (
              <p className="mt-5 max-w-4xl text-lg font-bold leading-relaxed">
                {(s.offerings as string[]).map((o, j) => (
                  <span key={o}>
                    {j > 0 && <span className="mx-2 text-muted">|</span>}
                    {o}
                  </span>
                ))}
              </p>
            )}

            {(s.technologies ?? []).length > 0 && (
              <>
                <hr className="my-8 border-line" />
                <h3 className="text-xl font-bold">Technology We Use</h3>
                {s.tech_intro && <p className="mt-3 max-w-4xl text-sm text-muted">{s.tech_intro}</p>}
                <div className="mt-5">
                  <TechChips items={s.technologies as string[]} />
                </div>
              </>
            )}
          </div>
        </Section>
      ))}

      {/* Process */}
      <Section>
        <SectionTitle kicker="Process" title="How we work" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((st, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface p-5">
              <div className="text-xs font-bold text-accent">STEP {i + 1}</div>
              <h3 className="mt-2 font-semibold">{st.title}</h3>
              <p className="mt-2 text-sm text-muted">{st.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Capabilities */}
      <Section tint>
        <SectionTitle kicker="Capabilities" title="Engineering capabilities" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(capabilities.data ?? []).map((c) => (
            <div key={c.id} className="flex gap-3">
              <span className="inline-flex h-fit rounded-xl bg-ink p-2.5 text-bg">
                <IconByName name={c.icon} size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold">{c.title}</div>
                <div className="mt-1 text-sm text-muted">{c.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand title="Ready to scope your project?" body="Tell us what you are building — we reply within one business day." button="Get in touch" />
    </>
  );
}
