import Image from "next/image";
import { IconByName } from "@/components/icon-map";

/** Background artwork per service, from public/service/. */
const SERVICE_IMAGES: Record<string, string> = {
  "web-development": "/service/service-web.jpg",
  "mobile-apps": "/service/service-mobile.jpg",
  "erp-development": "/service/service-erp.jpg",
  "saas-development": "/service/service-saas.jpg",
  "ai-automation": "/service/service-ai.jpg",
  "cloud-devops": "/service/service-devops.jpg",
};

/** Per-card gradient hues so grids don't look uniform. */
const ICON_HUES = [
  "from-accent to-violet-500 shadow-accent/30",
  "from-sky-500 to-cyan-500 shadow-sky-500/30",
  "from-emerald-500 to-teal-500 shadow-emerald-500/30",
  "from-amber-500 to-orange-500 shadow-amber-500/30",
  "from-pink-500 to-rose-500 shadow-pink-500/30",
  "from-indigo-500 to-blue-500 shadow-indigo-500/30",
];

export interface ServiceCardData {
  slug: string;
  title: string;
  summary: string;
  icon: string;
}

/** Flagship services shown as large cards on top of service grids. */
const FEATURED_SLUGS = ["erp-development"];

/** Split services into featured (in FEATURED_SLUGS order) and the rest. */
export function splitFeatured<T extends { slug: string }>(all: T[]): { featured: T[]; rest: T[] } {
  const featured = FEATURED_SLUGS.map((slug) => all.find((s) => s.slug === slug)).filter(
    (s): s is T => s != null,
  );
  const rest = all.filter((s) => !FEATURED_SLUGS.includes(s.slug));
  return { featured, rest };
}

/** Service card with the artwork as a full background image, dashed offset
 *  frame behind. Renders as an anchor when `href` is given.
 *  `variant`: "featured" = large hero card with summary + badge,
 *  "compact" = icon + title only, no dashed frame; default = classic card. */
export function ServiceCard({
  service: s,
  index,
  href,
  variant,
  className,
}: {
  service: ServiceCardData;
  index: number;
  href?: string;
  variant?: "featured" | "compact";
  /** Extra classes on the root wrapper — e.g. grid spans in bento layouts. */
  className?: string;
}) {
  const img = SERVICE_IMAGES[s.slug];
  const featured = variant === "featured";
  const compact = variant === "compact";

  const inner = (
    <>
      {img && (
        <Image
          src={img}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/25" />
      {featured && (
        <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink shadow-md shadow-accent/30">
          Featured
        </span>
      )}
      {/* Bento grid: 1×1 cells are 16:9; the featured card spans 2×2 from md
          up and stretches to the rows, which keeps roughly the same ratio. */}
      <div
        className={`relative flex h-full flex-col p-5 ${
          featured
            ? "aspect-video md:aspect-auto md:p-7"
            : compact
              ? "aspect-video"
              : "min-h-[200px]"
        }`}
      >
        <span
          className={`inline-flex w-fit rounded bg-gradient-to-br p-2.5 text-white shadow-md ${ICON_HUES[index % ICON_HUES.length]}`}
        >
          <IconByName name={s.icon} size={featured ? 24 : 20} />
        </span>
        <h3
          className={`mt-auto pt-6 font-semibold text-white ${
            featured ? "font-display text-xl md:text-2xl" : compact ? "font-display text-xl" : ""
          }`}
        >
          {s.title}
        </h3>
        <p className="mt-2 text-sm text-white/80">{s.summary}</p>
      </div>
    </>
  );

  const cardClass =
    "group relative block h-full overflow-hidden rounded border border-accent/80 shadow-md shadow-black/5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/10";

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="absolute inset-0 translate-x-3 translate-y-3 border-2 rounded border-dashed border-accent/80" />
      {href ? (
        <a href={href} className={cardClass}>
          {inner}
        </a>
      ) : (
        <div className={cardClass}>{inner}</div>
      )}
    </div>
  );
}
