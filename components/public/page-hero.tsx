import type { ReactNode } from "react";

/**
 * Shared hero for all public pages: halftone dot-wave background
 * (/hero-bg.svg) behind the title. `big` = home-page sizing.
 */
export function PageHero({
  title,
  sub,
  big,
  children,
}: {
  title: ReactNode;
  sub?: string;
  big?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/hero-bg.svg')] bg-cover bg-center opacity-70 dark:opacity-25"
      />
      {/* Scrim: fades the dots behind the text so copy stays readable. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-transparent"
      />
      <div className={`relative mx-auto max-w-6xl px-4 ${big ? "py-24 md:py-32" : "py-16 md:py-24"}`}>
        <div className="max-w-3xl">
          <h1 className={`font-bold tracking-tight ${big ? "text-4xl md:text-6xl" : "text-3xl md:text-5xl"}`}>
            {title}
          </h1>
          {sub && <p className="mt-5 max-w-2xl text-lg font-medium text-ink/75">{sub}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
