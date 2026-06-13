import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text, list } from "@/lib/content";
import { Section, SectionTitle, SectionButton, CtaBand, AccentText } from "@/components/public/sections";
import { FaqList } from "@/components/public/faq-list";
import { PageHero } from "@/components/public/page-hero";
import { IconByName } from "@/components/icon-map";
import { formatDateHuman } from "@/lib/dates";
import { TestimonialSlider, type TestimonialData } from "@/components/public/testimonial-slider";
import { ServiceCard, splitFeatured } from "@/components/public/service-card";
import { WorkCard, type WorkCardData } from "@/components/public/work-card";

export default async function HomePage() {
  const db = await supabaseServer();
  const [content, services, capabilities, cases, testimonials, posts, faqs] = await Promise.all([
    getContent([
      "about.stats",
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
    db.from("testimonials").select("*").eq("is_published", true).order("sort_order"),
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
        title={<AccentText text={text(content, "home.hero", "title", "Software, engineered to ship")} />}
        sub={text(content, "home.hero", "subtitle")}
      >
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-accent px-8 py-3.5 text-sm font-medium uppercase tracking-[0.06em] text-accent-ink transition-colors hover:bg-accent/85"
          >
            {text(content, "home.hero", "cta", "Start a project")} <ArrowRight size={15} />
          </Link>
          <Link
            href="/work"
            className="inline-flex items-center border border-ink/15 px-8 py-3.5 text-sm uppercase tracking-[0.06em] text-ink/70 transition-colors hover:border-accent/50 hover:text-accent"
          >
            See our work
          </Link>
        </div>
      </PageHero>

      {/* Stats band — hairline-separated serif figures */}
      <section className="border-y border-accent/15 bg-bg">
        <div data-reveal className="mx-auto grid max-w-6xl grid-cols-2 px-4 py-12 md:grid-cols-4">
          {list<{ label: string; value: string }>(content, "about.stats", "stats").map((s, i, arr) => (
            <div
              key={i}
              className={`px-4 py-3 text-center ${i < arr.length - 1 ? "md:border-r md:border-accent/10" : ""}`}
            >
              <div className="font-display text-3xl font-medium tracking-tight text-accent md:text-4xl">
                {s.value}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.1em] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <Section tint>
        <SectionTitle
          kicker="Mission"
          title={text(content, "home.mission", "title", "Our mission")}
          sub={text(content, "home.mission", "body")}
        />
        <SectionButton href="/about" label="View About Us" />
      </Section>

      {/* Services — 2 featured cards on top, remaining 4 compact below */}
      <Section>
        <SectionTitle kicker="Services" title="What we build" action={{ href: "/services", label: "View All Services" }} />
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
                  className="md:col-span-2 md:row-span-2"
                />
              ))}
              {rest.map((s, i) => (
                <ServiceCard key={s.id} service={s} index={i + featured.length} variant="compact" />
              ))}
            </div>
          );
        })()}
      </Section>

      {/* Capabilities — sticky pitch + icon list */}
      <Section tint>
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="self-start lg:sticky lg:top-24">
            <h2 className="font-display text-3xl font-medium leading-tight tracking-tight md:text-4xl">
              <AccentText
                text={text(
                  content,
                  "home.capabilities",
                  "heading",
                  "We *Build* and *Transform* Products Using *AI-Powered* Technologies.",
                )}
              />
            </h2>
            <div className="mt-10 max-w-md border border-accent/20 bg-accent/[.03] p-8">
              <h3 className="font-display text-xl font-medium">
                {text(content, "home.capabilities", "card_title", "Fuel Your Digital-First Idea")}
              </h3>
              <p className="mt-2 text-sm font-light text-muted">
                {text(content, "home.capabilities", "card_subtitle", "With 20+ Transformation Experts")}
              </p>
              <Link
                href="/contact"
                className="mt-7 inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-medium uppercase tracking-[0.08em] text-accent-ink transition-colors hover:bg-accent/85"
              >
                {text(content, "home.capabilities", "card_button", "Innovate With Us")}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="space-y-10">
            {(capabilities.data ?? []).map((c) => (
              <div key={c.id}>
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center border border-accent/25 text-accent">
                    <IconByName name={c.icon} size={18} />
                  </span>
                  <h3 className="font-display text-lg font-medium">{c.title}</h3>
                </div>
                <p className="mt-3 text-sm font-light leading-relaxed text-muted">{c.description}</p>
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
        {/* Hairline cells with mono index numbers */}
        <div className="grid gap-px border border-accent/15 bg-accent/15 sm:grid-cols-2 lg:grid-cols-4">
          {list<string>(content, "home.why", "points").map((p, i) => (
            <div key={i} className="flex flex-col gap-4 bg-bg p-6 transition-colors hover:bg-surface-2">
              <span className="font-mono text-[0.7rem] tracking-[0.2em] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-light leading-relaxed text-ink/80">{p}</span>
            </div>
          ))}
        </div>
        <SectionButton href="/about" label="View About Us" />
      </Section>

      {/* Featured work — hairline-separated rows (design language) */}
      <Section tint>
        <SectionTitle kicker="Work" title="Featured work" action={{ href: "/work", label: "View All Work" }} />
        <div className="grid gap-px border border-accent/15 bg-accent/15">
          {(cases.data ?? []).map((c) => {
            const serviceTitle =
              (c.services as unknown as { title: string } | null)?.title ?? null;
            return (
              <WorkCard
                key={c.id}
                work={{
                  id: c.id,
                  slug: c.slug,
                  title: c.title,
                  summary: c.summary,
                  body: c.body,
                  cover_url: c.cover_url,
                  service_title: serviceTitle,
                }}
              />
            );
          })}
        </div>
      </Section>

      {/* Customer voice */}
      <Section>
        <SectionTitle kicker="Customer voice" title="What clients say" />
        {/* Slider: focused slide carries the brand-gradient highlight */}
        <TestimonialSlider items={(testimonials.data ?? []) as TestimonialData[]} />
      </Section>

      <CtaBand
        title={text(content, "home.cta2", "title", "Not sure where to start?")}
        body={text(content, "home.cta2", "body")}
        button={text(content, "home.cta2", "button", "Book a call")}
      />

      {/* Blog — hairline grid cards (design language) */}
      <Section>
        <SectionTitle kicker="Blog" title="From the team" action={{ href: "/blog", label: "View All Posts" }} />
        <div className="grid gap-px border border-accent/15 bg-accent/15 sm:grid-cols-2 lg:grid-cols-3">
          {(posts.data ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group flex flex-col bg-bg p-7 transition-colors hover:bg-surface-2"
            >
              <div className="mb-5 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.15em]">
                <span className="text-accent">{p.author_name}</span>
                <time className="text-muted">{formatDateHuman(p.published_at?.slice(0, 10))}</time>
              </div>
              <h3 className="font-display text-lg font-medium leading-snug transition-colors group-hover:text-accent">{p.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm font-light leading-relaxed text-muted">{p.excerpt}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
                Read article <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
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
