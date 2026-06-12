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
            <div className="grid gap-8 md:grid-cols-3">
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
              <span className="inline-flex rounded bg-gradient-to-br from-accent to-violet-500 p-3.5 text-white shadow-lg shadow-accent/30">
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((st, i) => (
            <div
              key={i}
              className="rounded border border-line bg-surface p-5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-violet-500 text-sm font-bold text-white shadow-md shadow-accent/30">
                {i + 1}
              </span>
              <h3 className="mt-3 font-display font-semibold">{st.title}</h3>
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
              <span className="inline-flex h-fit rounded bg-gradient-to-br from-accent to-violet-500 p-2.5 text-white shadow-md shadow-accent/30">
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
