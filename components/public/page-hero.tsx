import type { ReactNode } from "react";

/**
 * Shared hero for all public pages, luxury treatment: faint page artwork,
 * gold radial glow, structural grid lines, serif display title.
 * `big` = home-page sizing.
 */
export function PageHero({
  title,
  sub,
  big,
  bg,
  children,
}: {
  title: ReactNode;
  sub?: string;
  big?: boolean;
  bg?: string;
  children?: ReactNode;
}) {

  const pageBg = bg || "home";

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-20 blur-[2px] dark:opacity-10"
        style={{
          backgroundImage: `url('/back/back-${pageBg}.jpg')`,
        }}
      />
      {/* Structural grid lines + gold ambient glow */}
      <div aria-hidden className="lux-grid-bg absolute inset-0" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgb(var(--accent)/0.08)_0%,transparent_70%)]"
      />
      {/* Scrim: fades the artwork toward the page background at the bottom. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg"
      />
      <div className={`relative mx-auto max-w-6xl px-4 ${big ? "py-28 md:py-36" : "py-16 md:py-24"}`}>
        <div data-reveal className="in max-w-3xl">
          <div className="mb-6 flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.25em] text-accent">
            <span aria-hidden className="h-px w-8 bg-accent/60" />
            Sonex-Digital
          </div>
          <h1
            className={`font-display font-medium tracking-tight ${big ? "text-4xl leading-[1.1] md:text-6xl" : "text-3xl md:text-5xl"}`}
          >
            {title}
          </h1>
          {sub && (
            <p className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-ink/70">{sub}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
