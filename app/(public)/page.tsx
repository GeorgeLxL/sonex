import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text, list } from "@/lib/content";
import { Section, SectionTitle, SectionButton, CtaBand, FaqList, AccentText } from "@/components/public/sections";
import { PageHero } from "@/components/public/page-hero";
import { IconByName } from "@/components/icon-map";
import { WorkCard } from "@/components/public/work-card";
import { formatDateHuman } from "@/lib/dates";

export default async function HomePage() {
  const db = await supabaseServer();
  const [content, services, capabilities, cases, testimonials, posts, faqs] = await Promise.all([
    getContent([
      "home.hero",
      "home.mission",
      "home.why",
      "home.capabilities",
      "home.cta1",
      "home.cta2",
      "home.cta3",
    ]),
    db.from("services").select("*").eq("is_published", true).order("sort_order").limit(6),
    db.from("capabilities").select("*").eq("is_published", true).order("sort_order"),
    db
      .from("case_studies")
      .select("id, slug, title, summary, body, cover_url, services(title)")
      .eq("is_published", true)
      .order("sort_order")
      .limit(3),
    db.from("testimonials").select("*").eq("is_published", true).order("sort_order").limit(3),
    db
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_url, author_name, published_at")
      .eq("approval_status", "approved")
      .order("published_at", { ascending: false })
      .limit(3),
    db.from("faqs").select("*").eq("is_published", true).order("sort_order"),
  ]);

  return (
    <>
      {/* Hero */}
      <PageHero
        big
        title={text(content, "home.hero", "title", "Software, engineered to ship")}
        sub={text(content, "home.hero", "subtitle")}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:opacity-90"
          >
            {text(content, "home.hero", "cta", "Start a project")} <ArrowRight size={16} />
          </Link>
          <Link
            href="/work"
            className="rounded border border-line bg-bg/60 px-5 py-3 text-sm font-semibold hover:bg-surface"
          >
            See our work
          </Link>
        </div>
      </PageHero>

      {/* Mission */}
      <Section tint>
        <SectionTitle
          kicker="Mission"
          title={text(content, "home.mission", "title", "Our mission")}
          sub={text(content, "home.mission", "body")}
        />
        <SectionButton href="/about" label="View About Us" />
      </Section>

      {/* Services */}
      <Section>
        <SectionTitle kicker="Services" title="What we build" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(services.data ?? []).map((s) => (
            <div key={s.id} className="rounded-lg border border-line bg-surface p-5">
              <span className="inline-flex rounded-xl bg-ink p-2.5 text-bg">
                <IconByName name={s.icon} size={20} />
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.summary}</p>
            </div>
          ))}
        </div>
        <SectionButton href="/services" label="View All Services" />
      </Section>

      {/* Capabilities — sticky pitch + icon list */}
      <Section tint>
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="self-start lg:sticky lg:top-24">
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              <AccentText
                text={text(
                  content,
                  "home.capabilities",
                  "heading",
                  "We *Build* and *Transform* Products Using *AI-Powered* Technologies.",
                )}
              />
            </h2>
            <div className="mt-10 max-w-md rounded-2xl border border-white/10 bg-[#0a1128] p-8 text-white">
              <h3 className="text-xl font-bold">
                {text(content, "home.capabilities", "card_title", "Fuel Your Digital-First Idea")}
              </h3>
              <p className="mt-2 text-sm font-medium text-white/80">
                {text(content, "home.capabilities", "card_subtitle", "With 20+ Transformation Experts")}
              </p>
              <Link
                href="/contact"
                className="mt-6 inline-flex items-center gap-2 rounded bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90"
              >
                {text(content, "home.capabilities", "card_button", "Innovate With Us")}
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="space-y-10">
            {(capabilities.data ?? []).map((c) => (
              <div key={c.id}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-xl bg-ink p-2.5 text-bg">
                    <IconByName name={c.icon} size={20} />
                  </span>
                  <h3 className="text-lg font-bold">{c.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <CtaBand
        title={text(content, "home.cta1", "title", "Have a project in mind?")}
        body={text(content, "home.cta1", "body")}
        button={text(content, "home.cta1", "button", "Get in touch")}
      />

      {/* Why choose us */}
      <Section>
        <SectionTitle kicker="Why us" title={text(content, "home.why", "title", "Why choose us")} />
        <div className="grid gap-4 sm:grid-cols-2">
          {list<string>(content, "home.why", "points").map((p, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
              <span className="text-sm">{p}</span>
            </div>
          ))}
        </div>
        <SectionButton href="/about" label="View About Us" />
      </Section>

      {/* Featured work — same cards as the work page, top 3 */}
      <Section tint>
        <SectionTitle kicker="Work" title="Featured work" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(cases.data ?? []).map((c) => (
            <WorkCard
              key={c.id}
              work={{
                id: c.id,
                slug: c.slug,
                title: c.title,
                summary: c.summary,
                body: c.body,
                cover_url: c.cover_url,
                service_title:
                  (c.services as unknown as { title: string } | null)?.title ?? null,
              }}
            />
          ))}
        </div>
        <SectionButton href="/work" label="View All Work" />
      </Section>

      {/* Customer voice */}
      <Section>
        <SectionTitle kicker="Customer voice" title="What clients say" />
        <div className="grid gap-4 md:grid-cols-3">
          {(testimonials.data ?? []).map((t) => (
            <figure key={t.id} className="rounded-lg border border-line bg-surface p-5">
              <blockquote className="text-sm">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">
                {t.author}
                <span className="block font-normal text-muted">{t.company}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <CtaBand
        title={text(content, "home.cta2", "title", "Not sure where to start?")}
        body={text(content, "home.cta2", "body")}
        button={text(content, "home.cta2", "button", "Book a call")}
      />

      {/* Blog */}
      <Section>
        <SectionTitle kicker="Blog" title="From the team" />
        <div className="grid gap-4 md:grid-cols-3">
          {(posts.data ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-accent"
            >
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-surface-2 text-3xl font-black text-line">
                  SX
                </div>
              )}
              <div className="p-5">
                <h3 className="font-semibold group-hover:text-accent">{p.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{p.excerpt}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{p.author_name}</span>
                  <time>{formatDateHuman(p.published_at?.slice(0, 10))}</time>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <SectionButton href="/blog" label="View All Posts" />
      </Section>

      {/* FAQ */}
      <Section tint>
        <SectionTitle kicker="FAQ" title="Common questions" />
        <FaqList faqs={faqs.data ?? []} />
      </Section>

      <CtaBand
        title={text(content, "home.cta3", "title", "Let's talk")}
        body={text(content, "home.cta3", "body")}
        button={text(content, "home.cta3", "button", "Contact us")}
      />
    </>
  );
}
