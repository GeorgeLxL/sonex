import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** 404 for public content (e.g. unpublished blog/work slugs) — rendered
 *  inside the public layout, so the header and footer stay visible. */
export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-28 text-center md:py-36">
      <div className="font-display text-7xl font-medium text-accent md:text-8xl">404</div>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight md:text-3xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-muted">
        The page you are looking for does not exist or is no longer published.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 bg-accent px-8 py-3.5 text-sm font-medium uppercase tracking-[0.06em] text-accent-ink transition-colors hover:bg-accent/85"
      >
        Back to home <ArrowRight size={14} />
      </Link>
    </section>
  );
}
