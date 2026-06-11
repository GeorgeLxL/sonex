import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text, list } from "@/lib/content";
import { Section, SectionTitle, CtaBand } from "@/components/public/sections";
import { PageHero } from "@/components/public/page-hero";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "About" };

interface ValueItem { title: string; body: string }
interface StatItem { label: string; value: string }

export default async function AboutPage() {
  const db = await supabaseServer();
  const [content, leadership] = await Promise.all([
    getContent(["about.story", "about.mission", "about.values", "about.stats"]),
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
      <PageHero title="About us" sub={text(content, "about.story", "body")} />

      <Section tint>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-accent">Mission</h2>
            <p className="mt-3 text-lg font-medium">{text(content, "about.mission", "mission")}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-accent">Vision</h2>
            <p className="mt-3 text-lg font-medium">{text(content, "about.mission", "vision")}</p>
          </div>
        </div>
      </Section>

      <Section>
        <SectionTitle kicker="Values" title="What we stand for" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface p-5">
              <h3 className="font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {leaders.length > 0 && (
        <Section tint>
          <SectionTitle kicker="Leadership" title="Leadership team" />
          <div className="grid gap-4 sm:grid-cols-2">
            {leaders.map((p) => (
              <div key={p.role_name} className="rounded-lg border border-line bg-surface p-6">
                <div className="flex items-center gap-4">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt={p.full_name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent">
                      {initials(p.full_name)}
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-semibold">{p.full_name}</div>
                    <div className="text-sm text-accent">
                      {ROLE_LABEL[p.role_name] ?? p.role_name.toUpperCase()}
                    </div>
                  </div>
                </div>
                {p.bio && <p className="mt-4 text-sm text-muted">{p.bio}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section>
        <SectionTitle kicker="Numbers" title="Company stats" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface p-6 text-center">
              <div className="text-3xl font-bold text-accent">{s.value}</div>
              <div className="mt-1 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand title="Work with us" body="As a client or as a teammate — we would love to hear from you." button="Get in touch" />
    </>
  );
}
