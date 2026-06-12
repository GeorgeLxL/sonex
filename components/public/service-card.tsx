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

/** Service card with the artwork as a full background image, dashed offset
 *  frame behind. Renders as an anchor when `href` is given. */
export function ServiceCard({
  service: s,
  index,
  href,
}: {
  service: ServiceCardData;
  index: number;
  href?: string;
}) {
  const img = SERVICE_IMAGES[s.slug];

  const inner = (
    <>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/25" />
      <div className="relative flex h-full min-h-[200px] flex-col p-5">
        <span
          className={`inline-flex w-fit rounded bg-gradient-to-br p-2.5 text-white shadow-md ${ICON_HUES[index % ICON_HUES.length]}`}
        >
          <IconByName name={s.icon} size={20} />
        </span>
        <h3 className="mt-auto pt-6 font-semibold text-white">{s.title}</h3>
        <p className="mt-2 text-sm text-white/80">{s.summary}</p>
      </div>
    </>
  );

  const cardClass =
    "group relative block h-full overflow-hidden rounded border border-accent/80 shadow-md shadow-black/5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/10";

  return (
    <div className="relative">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rounded border-2 border-dashed border-accent/80" />
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
