import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Global 404 for URLs that match no route — rendered in the root layout
 *  (no public header/footer), so it centers itself on the viewport. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text font-display text-7xl font-bold text-transparent md:text-8xl">
        404
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight md:text-3xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded bg-accent px-6 py-3 text-sm font-semibold text-accent-ink shadow-lg shadow-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/40"
      >
        Back to home <ArrowRight size={15} />
      </Link>
    </main>
  );
}
