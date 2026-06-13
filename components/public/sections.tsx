import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/** Centered "View …" link at the bottom of a section — gold hairline-underlined. */
export function SectionButton({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-12 flex justify-center">
      <Link
        href={href}
        className="inline-flex items-center gap-2 border-b border-accent/30 pb-1 text-xs uppercase tracking-[0.1em] text-accent transition-colors hover:border-accent"
      >
        {label} <ArrowRight size={13} />
      </Link>
    </div>
  );
}

/** Renders "*word*" markers as italic serif gold-gradient accents. */
export function AccentText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <em key={i} className="lux-gradient-text">
            {part.slice(1, -1)}
          </em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export function Section({
  children,
  tint,
  id,
}: {
  children: ReactNode;
  tint?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`border-t border-accent/10 ${tint ? "bg-surface" : "bg-bg"}`}>
      <div data-reveal className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        {children}
      </div>
    </section>
  );
}

export function SectionTitle({
  kicker,
  title,
  sub,
  action,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  /** Optional top-right link (design's "View All →" treatment). */
  action?: { href: string; label: string };
}) {
  return (
    <div className={`mb-12 flex flex-wrap items-end justify-between gap-4 ${action ? "" : ""}`}>
      <div className="max-w-2xl">
        {kicker && (
          <div className="mb-5 flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.25em] text-accent">
            <span aria-hidden className="h-px w-6 bg-accent" />
            {kicker}
          </div>
        )}
        <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{title}</h2>
        {sub && <p className="mt-4 font-light leading-relaxed text-muted">{sub}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 whitespace-nowrap border-b border-accent/30 pb-1 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-accent transition-colors hover:border-accent"
        >
          {action.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

export function CtaBand({ title, body, button }: { title: string; body: string; button: string }) {
  // Luxury bordered panel: hairline gold frame, faint radial glow, centered.
  return (
    <section className="border-t border-accent/10 bg-bg px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden border border-accent/20 px-6 py-16 text-center md:px-16 md:py-20">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgb(var(--accent)/0.07)_0%,transparent_70%)]"
          />
          <div className="relative">
            <div className="mb-6 flex items-center justify-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.25em] text-accent">
              <span aria-hidden className="h-px w-6 bg-accent" />
              Let&rsquo;s build together
              <span aria-hidden className="h-px w-6 bg-accent" />
            </div>
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-5xl">{title}</h2>
            <p className="mx-auto mt-5 max-w-md font-light leading-relaxed text-muted">{body}</p>
            <Link
              href="/contact"
              className="mt-10 inline-flex items-center gap-2 bg-accent px-8 py-3.5 text-sm font-medium uppercase tracking-[0.06em] text-accent-ink transition-colors hover:bg-accent/85"
            >
              {button} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
