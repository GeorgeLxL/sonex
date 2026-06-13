import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, list } from "@/lib/content";
import { Section, SectionTitle, CtaBand } from "@/components/public/sections";
import { IconByName } from "@/components/icon-map";
import { TechChips } from "@/components/public/tech-chip";
import { PageHero } from "@/components/public/page-hero";
import { ServiceCard, splitFeatured } from "@/components/public/service-card";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Web, mobile, ERP, SaaS, AI and cloud — six disciplines, one senior team. Every engagement ships production software.",
};

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
        bg='services'
      />

      <Section>
        {(() => {
          const { featured, rest } = splitFeatured(services.data ?? []);
          return (
            <div className="grid gap-px border border-accent/15 bg-accent/15 md:grid-cols-3">
              {featured.map((s, i) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  index={i}
                  variant="featured"
                  href={`#${s.slug}`}
                  className="md:col-span-2 md:row-span-2"
                />
              ))}
              {rest.map((s, i) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  index={i + featured.length}
                  variant="compact"
                  href={`#${s.slug}`}
                />
              ))}
            </div>
          );
        })()}
      </Section>

      {/* Detailed sections — one rich block per service */}
      {(services.data ?? []).map((s, i) => (
        <Section key={s.id} tint={i % 2 === 0} id={s.slug}>
          <div className="scroll-mt-24">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 items-center justify-center border border-accent/30 text-accent">
                <IconByName name={s.icon} size={26} strokeWidth={1.5} />
              </span>
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">{s.title}</h2>
            </div>

            <p className="mt-6 max-w-4xl font-light leading-relaxed text-muted">{s.description}</p>

            {(s.offerings ?? []).length > 0 && (
              <p className="mt-6 max-w-4xl font-display text-lg font-medium leading-relaxed">
                {(s.offerings as string[]).map((o, j) => (
                  <span key={o}>
                    {j > 0 && <span className="mx-3 text-accent/40">/</span>}
                    {o}
                  </span>
                ))}
              </p>
            )}

            {(s.technologies ?? []).length > 0 && (
              <>
                <hr className="my-8 border-accent/15" />
                <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.25em] text-accent">Technology we use</h3>
                {s.tech_intro && <p className="mt-3 max-w-4xl text-sm font-light text-muted">{s.tech_intro}</p>}
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
        <div className="grid gap-px border border-accent/15 bg-accent/15 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((st, i) => (
            <div key={i} className="bg-bg p-6 transition-colors hover:bg-surface-2">
              <span className="font-mono text-[0.7rem] tracking-[0.2em] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-display text-lg font-medium">{st.title}</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted">{st.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Capabilities */}
      <Section tint>
        <SectionTitle kicker="Capabilities" title="Engineering capabilities" />
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {(capabilities.data ?? []).map((c) => (
            <div key={c.id} className="flex gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-accent/30 text-accent">
                <IconByName name={c.icon} size={18} strokeWidth={1.5} />
              </span>
              <div>
                <div className="font-display text-base font-medium">{c.title}</div>
                <div className="mt-1.5 text-sm font-light leading-relaxed text-muted">{c.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand title="Ready to scope your project?" body="Tell us what you are building — we reply within one business day." button="Get in touch" />
    </>
  );
}
