import Link from "next/link";
import { cn } from "@/lib/utils";

export interface WorkCardData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  cover_url: string | null;
  service_title: string | null;
}

/** Portfolio card: title, service badge, blurb, image, case-study link.
 *  `featured` = hero treatment (image-first, bigger type, full height). */
export function WorkCard({ work, featured }: { work: WorkCardData; featured?: boolean }) {
  const blurb = work.summary || work.body;

  if (featured) {
    return (
      // <>
      // <Link
      //   href={`/work/${work.slug}`}
      //   className="group flex h-full flex-col overflow-hidden rounded border border-line/60 bg-surface shadow-wings transition-all hover:-translate-y-1 hover:border-accent/40"
      // >
      //   {work.cover_url ? (
      //     // eslint-disable-next-line @next/next/no-img-element
      //     <img
      //       src={work.cover_url}
      //       alt={work.title}
      //       className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] lg:h-80"
      //     />
      //   ) : (
      //     <div className="flex h-64 w-full items-center justify-center bg-surface-2 text-6xl font-black text-line lg:h-80">
      //       SX
      //     </div>
      //   )}
      //   <div className="flex flex-1 flex-col p-7">
      //     <div className="flex flex-wrap items-center gap-3">
      //       <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
      //         Featured
      //       </span>
      //       {work.service_title && (
      //         <span className="rounded border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
      //           {work.service_title}
      //         </span>
      //       )}
      //     </div>
      //     <h3 className="mt-3 font-display text-3xl font-bold tracking-tight text-accent">
      //       {work.title}
      //     </h3>
      //     <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">{blurb}</p>
      //   </div>
      // </Link>
      <Link
        href={`/work/${work.slug}`}
        className="group block overflow-hidden rounded border border-line/60 bg-surface shadow-wings transition-all hover:-translate-y-1 hover:border-accent/40"
      >
        <div className="overflow-hidden">
          {work.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={work.cover_url}
              alt={work.title}
              loading="lazy"
              decoding="async"
              className="h-60 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-60 w-full items-center justify-center bg-surface-2 text-5xl font-black text-line">
              SX
            </div>
          )}
        </div>
        <div className="p-6">
          {work.service_title && (
            <span className="rounded border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {work.service_title}
            </span>
          )}
          <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-accent">
            {work.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{work.summary}</p>
        </div>
      </Link>
      // </>
    );
  }

  return (
    // <Link
    //   href={`/work/${work.slug}`}
    //   className={cn(
    //     "flex h-full flex-col rounded border border-line/60 bg-surface shadow-wings transition-all hover:-translate-y-1 hover:border-accent/40",
    //   )}
    // >
    //   <div className="p-6">
    //     <h3 className="font-display text-2xl font-bold tracking-tight text-accent mb-3">{work.title}</h3>
    //     {work.service_title && (
    //       <span className="w-fit rounded border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
    //         {work.service_title}
    //       </span>
    //     )}
    //     <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-muted">{blurb}</p>
    //   </div>
    //   <div>
    //     {work.cover_url ? (
    //       // eslint-disable-next-line @next/next/no-img-element
    //       <img
    //         src={work.cover_url}
    //         alt={work.title}
    //         className="aspect-[4/3] w-full rounded object-cover"
    //       />
    //     ) : (
    //       <div className="flex aspect-[4/3] w-full items-center justify-center rounded bg-surface-2 text-5xl font-black text-line">
    //         SX
    //       </div>
    //     )}
    //   </div>
    // </Link>
    <Link
        href={`/work/${work.slug}`}
        className="group block overflow-hidden rounded border border-line/60 bg-surface shadow-wings transition-all hover:-translate-y-1 hover:border-accent/40"
      >
        <div className="overflow-hidden">
          {work.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={work.cover_url}
              alt={work.title}
              loading="lazy"
              decoding="async"
              className="h-60 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-60 w-full items-center justify-center bg-surface-2 text-5xl font-black text-line">
              SX
            </div>
          )}
        </div>
        <div className="p-6">
          {work.service_title && (
            <span className="rounded border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {work.service_title}
            </span>
          )}
          <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-accent">
            {work.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{work.summary}</p>
        </div>
      </Link>
  );
}
