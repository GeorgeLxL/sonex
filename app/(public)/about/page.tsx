import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text, list } from "@/lib/content";
import { Section, SectionTitle, CtaBand } from "@/components/public/sections";
import { IconByName } from "@/components/icon-map";
import { PageHero } from "@/components/public/page-hero";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description: "Who we are: the mission, values and leadership team behind Sonex-Digital.",
};

interface ValueItem { title: string; body: string }
interface StatItem { label: string; value: string }

export default async function AboutPage() {
  const db = await supabaseServer();
  const [content, leadership] = await Promise.all([
    getContent(["about.story", "about.mission", "about.values", "about.stats", "about.team"]),
    // Anon-safe leadership cards; the COO toggles CEO/CTO visibility in the CMS.
    db.rpc("public_leadership"),
  ]);

  const values = list<ValueItem>(content, "about.values", "values");
  const stats = list<StatItem>(content, "about.stats", "stats");
  const ROLE_LABEL: Record<string, string> = {
    ceo: "Chief Executive Officer",
    cto: "Chief Technology Officer",
  };
  const leaders = (leadership.data ?? []) as {
    role_name: string;
    full_name: string;
    avatar_url: string | null;
    bio: string;
  }[];

  return (
    <>
      <PageHero title="About us" sub={text(content, "about.story", "body")} bg='about' />

      <Section tint>
        <div className="grid gap-px border border-accent/15 bg-accent/15 md:grid-cols-2">
          <div className="bg-bg p-8">
            <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.25em] text-accent">Mission</h2>
            <p className="mt-4 font-display text-xl font-medium leading-relaxed">{text(content, "about.mission", "mission")}</p>
          </div>
          <div className="bg-bg p-8">
            <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.25em] text-accent">Vision</h2>
            <p className="mt-4 font-display text-xl font-medium leading-relaxed">{text(content, "about.mission", "vision")}</p>
          </div>
        </div>
      </Section>

      <section className="relative">
        <Image
          src="/company.jpg"
          alt="The Sonex-Digital leadership team in the boardroom"
          width={1672}
          height={713}
          sizes="100vw"
          className="w-full object-cover"
        />
        {/* Overlays the photo on md+; flows under it on phones. */}
        <div className="flex flex-col justify-end md:absolute md:inset-0 md:z-10">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
            <div className="max-w-2xl border border-accent/30 bg-black/85 p-6 text-white backdrop-blur-sm md:p-8">
              <div className="mb-4 flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.25em] text-accent">
                <span aria-hidden className="h-px w-6 bg-accent" />
                {text(content, "about.team", "kicker", "Our team")}
              </div>
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                {text(content, "about.team", "title", "The people behind the product")}
              </h2>
              <p className="mt-3 font-light leading-relaxed text-white/70">
                {text(content, "about.team", "body", "Our leadership team combines deep technical expertise with a hands-on drive to build world-class software.")}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <p className="font-display text-sm italic text-white/80">
                  {text(content, "about.team", "tagline", "Five leaders, one table — decisions made together.")}
                </p>
                <Link
                  href="#leadership"
                  className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-medium uppercase tracking-[0.06em] text-accent-ink transition-colors hover:bg-accent/85"
                >
                  {text(content, "about.team", "button", "Meet the leadership")} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionTitle kicker="Values" title="What we stand for" />
        <div className="grid gap-px border border-accent/15 bg-accent/15 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <div key={i} className="bg-bg p-6 transition-colors hover:bg-surface-2">
              <span className="inline-flex h-11 w-11 items-center justify-center border border-accent/30 text-accent">
                <IconByName name={["sparkles", "shield", "workflow", "zap"][i % 4]} size={18} />
              </span>
              <h3 className="mt-5 font-display text-lg font-medium">{v.title}</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {leaders.length > 0 && (
        <Section tint id="leadership">
          <SectionTitle kicker="Leadership" title="Leadership team" />
          <div className="grid gap-px border border-accent/15 bg-accent/15 sm:grid-cols-2">
            {leaders.map((p) => (
              <div
                key={p.role_name}
                className="flex gap-5 bg-bg p-7 transition-colors hover:bg-surface-2"
              >
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatar_url}
                    alt={p.full_name}
                    loading="lazy"
                    decoding="async"
                    className="h-20 w-20 shrink-0 border border-accent/30 object-cover grayscale"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-accent/30 font-mono text-lg text-accent">
                    {initials(p.full_name)}
                  </div>
                )}
                <div>
                  <div className="font-display text-xl font-medium">{p.full_name}</div>
                  <div className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent">
                    {ROLE_LABEL[p.role_name] ?? p.role_name.toUpperCase()}
                  </div>
                  {p.bio && <p className="mt-3 text-sm font-light leading-relaxed text-muted">{p.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section>
        <SectionTitle kicker="Numbers" title="Company stats" />
        <div className="grid gap-px border border-accent/15 bg-accent/15 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-bg p-8 text-center">
              <div className="font-display text-4xl font-medium tracking-tight text-accent">
                {s.value}
              </div>
              <div className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand title="Work with us" body="As a client or as a teammate — we would love to hear from you." button="Get in touch" />
    </>
  );
}
