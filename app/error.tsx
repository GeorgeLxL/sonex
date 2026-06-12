"use client";

import Link from "next/link";

/** Root error boundary — shown when a page throws during render. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        An unexpected error occurred. Please try again — if it keeps happening, contact us.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-accent px-6 py-3 text-sm font-semibold text-accent-ink shadow-lg shadow-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/40"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded border border-line bg-surface px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-accent/40"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
