import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/** Centered "View …" button at the bottom of a section. */
export function SectionButton({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-10 flex justify-center">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded border border-line bg-surface px-6 py-3 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
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
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">{children}</div>
    </section>
  );
}

export function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      {kicker && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">{kicker}</div>
      )}
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-muted">{sub}</p>}
    </div>
  );
}

export function CtaBand({ title, body, button }: { title: string; body: string; button: string }) {
  // Lighter indigo in light mode, deep indigo in dark mode.
  return (
    <section className="bg-[#6366f1] dark:bg-[#312e81]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-12">
        <div>
          <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
          <p className="mt-1 max-w-xl text-sm text-white/80">{body}</p>
        </div>
        <Link
          href="/contact"
          className="rounded bg-white px-5 py-2.5 text-sm font-semibold text-[#4f46e5] transition-opacity hover:opacity-90 dark:text-[#312e81]"
        >
          {button}
        </Link>
      </div>
    </section>
  );
}

export function FaqList({ faqs }: { faqs: { id: string; question: string; answer: string }[] }) {
  if (!faqs.length) return null;
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-lg border border-line bg-surface">
      {faqs.map((f) => (
        <details key={f.id} className="group px-5 py-4">
          <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
            {f.question}
          </summary>
          <p className="mt-2 text-sm text-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
