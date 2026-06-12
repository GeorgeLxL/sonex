import Link from "next/link";
import { ArrowRight, DivideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Centered "View …" button at the bottom of a section. */
export function SectionButton({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-10 flex justify-center">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded bg-accent px-6 py-3 text-sm font-semibold text-accent-ink shadow-lg shadow-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/40"
      >
        {label} <ArrowRight size={15} />
      </Link>
    </div>
  );
}

/** Renders "*word*" markers as accent-colored spans. */
export function AccentText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <span key={i} className="text-accent">
            {part.slice(1, -1)}
          </span>
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
    <section id={id} className={tint ? "bg-surface" : ""}>
      <div data-reveal className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        {children}
      </div>
    </section>
  );
}

export function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      {kicker && (
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
          <span aria-hidden className="h-px w-8 bg-gradient-to-r from-accent to-transparent" />
          {kicker}
        </div>
      )}
      <h2 className="title-shadow font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-muted">{sub}</p>}
    </div>
  );
}

export function CtaBand({ title, body, button }: { title: string; body: string; button: string }) {
  // Indigo-violet gradient; deeper in dark mode.
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#6366f1] via-[#7c5cf0] to-[#8b5cf6] dark:from-[#312e81] dark:via-[#3b2f8f] dark:to-[#4c1d95]">
      <div
        aria-hidden
        className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-white/5 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-14">
        <div>
          <h2 className="font-display text-xl font-bold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.3)] md:text-2xl">{title}</h2>
          <p className="mt-1 max-w-xl text-sm text-white/80">{body}</p>
        </div>
        <Link
          href="/contact"
          className="rounded bg-white px-6 py-3 text-sm font-semibold text-[#4f46e5] shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:text-[#312e81]"
        >
          {button}
        </Link>
      </div>
    </section>
  );
}
