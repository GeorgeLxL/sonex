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
import { ServiceCard } from "@/components/public/service-card";

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
        title={text(content, "home.hero", "title", "Software, engineered to ship")}
        sub={text(content, "home.hero", "subtitle")}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded bg-accent px-6 py-3 text-sm font-semibold text-accent-ink shadow-lg shadow-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/40"
          >
            {text(content, "home.hero", "cta", "Start a project")} <ArrowRight size={16} />
          </Link>
          <Link
            href="/work"
            className="rounded bg-white px-6 py-3 text-sm font-semibold text-[#4f46e5] shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            See our work
          </Link>
        </div>
      </PageHero>

      {/* Stats band */}
      <section className="border-y border-line bg-surface">
        <div data-reveal className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-4">
          {list<{ label: string; value: string }>(content, "about.stats", "stats").map((s, i) => (
            <div key={i} className="text-center">
              <div className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text font-display text-3xl font-bold text-transparent md:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-muted">{s.label}</div>
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

      {/* Services — bento grid: first card featured, varied icon hues */}
      <Section>
        <SectionTitle kicker="Services" title="What we build" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {(services.data ?? []).map((s, i) => (
            <ServiceCard key={s.id} service={s} index={i} />
          ))}
        </div>
        <SectionButton href="/services" label="View All Services" />
      </Section>

      {/* Capabilities — sticky pitch + icon list */}
      <Section tint>
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="self-start lg:sticky lg:top-24">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              <AccentText
                text={text(
                  content,
                  "home.capabilities",
                  "heading",
                  "We *Build* and *Transform* Products Using *AI-Powered* Technologies.",
                )}
              />
            </h2>
            <div className="mt-10 max-w-md rounded border border-white/10 bg-[#0a1128] p-8 text-white">
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
                  <span className="inline-flex rounded bg-gradient-to-br from-accent to-violet-500 p-2.5 text-white shadow-md shadow-accent/30">
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
        {/* Tinted, borderless panels — deliberately different from card grids */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {list<string>(content, "home.why", "points").map((p, i) => (
            <div
              key={i}
              className="relative flex items-start gap-4 rounded bg-gradient-to-br from-accent/[.07] to-violet-500/[.05] p-5 pl-10 transition-all hover:-translate-y-0.5 hover:from-accent/[.12] hover:to-violet-500/[.08] dark:from-accent/10 dark:to-violet-500/5"
            >
              <span className="absolute -left-2 top-3 flex h-6 w-10 shrink-0 items-center justify-center bg-gradient-to-br from-accent to-violet-500 font-display text-sm font-bold text-white shadow-md shadow-accent/30">
                {i + 1}
              </span>
              <span className="pt-1 text-sm font-medium">{p}</span>
            </div>
          ))}
        </div>
        <SectionButton href="/about" label="View About Us" />
      </Section>

      {/* Featured work — same cards as the work page, top 3 */}
      <Section tint>
        <SectionTitle kicker="Work" title="Featured work" />
        {/* One wide showcase on top, two cards below */}
        <div className="grid gap-10 md:grid-cols-2">
          {(cases.data ?? []).map((c, i) => {
            const serviceTitle =
              (c.services as unknown as { title: string } | null)?.title ?? null;
            if (i === 0) {
              return (
                <Link
                  key={c.id}
                  href={`/work/${c.slug}`}
                  className="group block overflow-hidden rounded border border-line/60 bg-surface shadow-wings transition-all hover:-translate-y-1 hover:border-accent/40 md:col-span-2"
                >
                  <div className="overflow-hidden">
                    {c.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.cover_url}
                        alt={c.title}
                        className="h-80 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-80 w-full items-center justify-center bg-surface-2 text-6xl font-black text-line lg:h-full">
                        SX
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col p-7 lg:p-9">
                    {serviceTitle && (
                      <span className="w-fit rounded border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                        {serviceTitle}
                      </span>
                    )}
                    <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-accent md:text-3xl">
                      {c.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{c.summary}</p>
                  </div>
                </Link>
              );
            }
            return (
              <Link
                key={c.id}
                href={`/work/${c.slug}`}
                className="group block overflow-hidden rounded border border-line/60 bg-surface shadow-wings transition-all hover:-translate-y-1 hover:border-accent/40"
              >
                <div className="overflow-hidden">
                  {c.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.cover_url}
                      alt={c.title}
                      className="h-60 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-60 w-full items-center justify-center bg-surface-2 text-5xl font-black text-line">
                      SX
                    </div>
                  )}
                </div>
                <div className="p-6">
                  {serviceTitle && (
                    <span className="rounded border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                      {serviceTitle}
                    </span>
                  )}
                  <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-accent">
                    {c.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{c.summary}</p>
                </div>
              </Link>
            );
          })}
        </div>
        <SectionButton href="/work" label="View All Work" />
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

      {/* Blog */}
      <Section>
        <SectionTitle kicker="Blog" title="From the team" />
        <div className="gap-4 max-w-5xl mx-auto">
          {(posts.data ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group block sm:flex mb-5 overflow-hidden rounded border border-line/60 bg-surface shadow-md shadow-black/5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10"
            >
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.cover_url}
                  alt=""
                  className="h-32 w-full sm:w-32 shrink-0 object-cover transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <div className="h-36 w-36 shrink-0 items-center justify-center bg-surface-2 text-4xl font-black text-line">
                  SX
                </div>
              )}
              <div className="p-3 pr-8 w-full flex flex-col">
                <h3 className="font-semibold group-hover:text-accent">{p.title}</h3>
                <p className="mt-2 mb-4 line-clamp-2 text-sm text-muted">{p.excerpt}</p>
                <div className="mt-auto flex items-center justify-between text-xs text-muted">
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
