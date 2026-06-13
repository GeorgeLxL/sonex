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

/** Luxury service card: artwork behind a dark scrim, hairline icon box,
 *  serif title. Renders as an anchor when `href` is given.
 *  `variant`: "featured" = the large bento cell with badge; "compact" = 1×1
 *  bento cell; default = classic card (detail grids). */
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
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
      {featured && (
        <span className="absolute right-4 top-4 bg-accent px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-accent-ink">
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
        <span className="inline-flex h-11 w-11 items-center justify-center border border-accent/40 bg-black/30 text-accent">
          <IconByName name={s.icon} size={featured ? 20 : 18} />
        </span>
        <h3
          className={`mt-auto pt-6 font-display font-medium text-white ${
            featured ? "text-xl md:text-2xl" : compact ? "text-xl" : "text-lg"
          }`}
        >
          {s.title}
        </h3>
        <p className="mt-2 text-sm font-light leading-relaxed text-white/70">{s.summary}</p>
      </div>
    </>
  );

  const cardClass = "group relative block h-full overflow-hidden transition-colors";

  return (
    <div className={`relative ${className ?? ""}`}>
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
