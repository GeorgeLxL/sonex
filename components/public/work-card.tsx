import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export interface WorkCardData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  cover_url: string | null;
  service_title: string | null;
}

/** Portfolio row (design language): category · title on the left, the
 *  result/summary as an italic serif line, an arrow on the right.
 *  Rows are hairline-separated by the parent grid's 1px gap. */
export function WorkCard({ work }: { work: WorkCardData }) {
  return (
    <Link
      href={`/work/${work.slug}`}
      className="group grid items-start gap-6 bg-bg p-7 transition-colors hover:bg-surface-2 md:grid-cols-[1fr_2fr_auto] md:p-9"
    >
      <div>
        {work.service_title && (
          <div className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent">
            {work.service_title}
          </div>
        )}
        <div className="font-display text-xl font-medium tracking-tight">{work.title}</div>
      </div>
      <p className="font-display text-base italic leading-relaxed text-ink/70">{work.summary}</p>
      <span className="hidden text-accent/50 transition-colors group-hover:text-accent md:block">
        <ArrowUpRight size={20} strokeWidth={1.5} />
      </span>
    </Link>
  );
}
