import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface WorkCardData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  cover_url: string | null;
  service_title: string | null;
}

/** Portfolio card: title, service badge, blurb, image, case-study link. */
export function WorkCard({ work }: { work: WorkCardData }) {
  const blurb = work.summary || work.body;
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-2xl font-bold tracking-tight text-accent">{work.title}</h3>
      {work.service_title && (
        <span className="mt-3 w-fit rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          {work.service_title}
        </span>
      )}
      <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-muted">{blurb}</p>
      <div className="mt-5">
        {work.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.cover_url}
            alt={work.title}
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-surface-2 text-5xl font-black text-line">
            SX
          </div>
        )}
      </div>
      <Link
        href={`/work/${work.slug}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
      >
        View Case Study <ArrowRight size={15} />
      </Link>
    </div>
  );
}
