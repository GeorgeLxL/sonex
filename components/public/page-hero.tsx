import type { ReactNode } from "react";

/**
 * Shared hero for all public pages: halftone dot-wave background
 * (/hero-bg.svg) behind the title. `big` = home-page sizing.
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
        className={`absolute inset-0 bg-cover bg-center opacity-70 dark:opacity-40`}
        style={{
          backgroundImage: `url('/back/back-${pageBg}.png')`,
        }}
      />
      {/* Scrim: fades the dots behind the text so copy stays readable. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-transparent"
      />
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-accent/15 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-20 left-[30%] h-56 w-56 rounded-full bg-violet-500/10 blur-3xl"
      />
      <div className={`relative mx-auto max-w-6xl px-4 ${big ? "py-24 md:py-32" : "py-16 md:py-24"}`}>
        <div data-reveal className="in max-w-3xl">
          <h1
            className={`font-display font-bold tracking-tight ${big ? "text-4xl leading-[1.1] md:text-6xl" : "text-3xl md:text-5xl"}`}
          >
            <span className="bg-gradient-to-br from-ink via-ink to-accent bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(99,102,241,0.25)]">
              {title}
            </span>
          </h1>
          {sub && <p className="mt-5 max-w-2xl text-lg font-medium text-ink/75">{sub}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
