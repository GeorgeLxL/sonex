import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text, list } from "@/lib/content";
import { Section, SectionTitle, CtaBand } from "@/components/public/sections";
import { IconByName } from "@/components/icon-map";
import { PageHero } from "@/components/public/page-hero";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "About" };

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
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded border border-line bg-surface p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-accent">Mission</h2>
            <p className="mt-3 text-lg font-medium">{text(content, "about.mission", "mission")}</p>
          </div>
          <div className="rounded border border-line bg-surface p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-accent">Vision</h2>
            <p className="mt-3 text-lg font-medium">{text(content, "about.mission", "vision")}</p>
          </div>
        </div>
      </Section>

      <section className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="w-full object-cover" src="/company.jpg" alt="The Sonex-Digital leadership team in the boardroom" />
        {/* Overlays the photo on md+; flows under it on phones. */}
        <div className="flex flex-col justify-end md:absolute md:inset-0 md:z-10">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
            <div className="max-w-2xl rounded bg-black/80 p-6 text-white md:p-8">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
                <span aria-hidden className="h-px w-8 bg-gradient-to-r from-accent to-transparent" />
                {text(content, "about.team", "kicker", "Our team")}
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                {text(content, "about.team", "title", "The people behind the product")}
              </h2>
              <p className="mt-3 text-white/80">
                {text(content, "about.team", "body", "Our leadership team combines deep technical expertise with a hands-on drive to build world-class software.")}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-white/90">
                  {text(content, "about.team", "tagline", "Five leaders, one table — decisions made together.")}
                </p>
                <Link
                  href="#leadership"
                  className="inline-flex items-center gap-2 rounded bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink shadow-lg shadow-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/40"
                >
                  {text(content, "about.team", "button", "Meet the leadership")} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionTitle kicker="Values" title="What we stand for" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <div
              key={i}
              className="rounded border border-line bg-surface p-5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
            >
              <span className="inline-flex rounded bg-gradient-to-br from-accent/15 to-violet-500/15 p-2.5 text-accent">
                <IconByName name={["sparkles", "shield", "workflow", "zap"][i % 4]} size={20} />
              </span>
              <h3 className="mt-3 font-display font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {leaders.length > 0 && (
        <Section tint id="leadership">
          <SectionTitle kicker="Leadership" title="Leadership team" />
          <div className="grid gap-6 sm:grid-cols-2">
            {leaders.map((p) => (
              <div
                key={p.role_name}
                className="overflow-hidden rounded border border-line bg-surface transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/10"
              >
                <div className="h-32 bg-gradient-to-r from-[#6366f1] via-[#7c5cf0] to-[#8b5cf6] dark:from-[#312e81] dark:via-[#3b2f8f] dark:to-[#4c1d95]" />
                <div className="-mt-16 px-10 pb-10">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt={p.full_name}
                      className="h-32 w-32 rounded-full object-cover ring-4 ring-surface"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-accent to-violet-500 text-2xl font-bold text-white ring-4 ring-surface">
                      {initials(p.full_name)}
                    </div>
                  )}
                  <div className="mt-4 font-display text-xl font-bold">{p.full_name}</div>
                  <span className="mt-1.5 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    {ROLE_LABEL[p.role_name] ?? p.role_name.toUpperCase()}
                  </span>
                  {p.bio && <p className="mt-4 text-sm leading-relaxed text-muted">{p.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section>
        <SectionTitle kicker="Numbers" title="Company stats" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="rounded border border-line bg-surface p-6 text-center transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5"
            >
              <div className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text font-display text-4xl font-bold text-transparent">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand title="Work with us" body="As a client or as a teammate — we would love to hear from you." button="Get in touch" />
    </>
  );
}
