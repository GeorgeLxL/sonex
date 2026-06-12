import Link from "next/link";
import { cn } from "@/lib/utils";

export function TabNav({
  base,
  tabs,
  active,
}: {
  base: string;
  tabs: { key: string; label: string }[];
  active: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded border border-line bg-surface p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`${base}?tab=${t.key}`}
          className={cn(
            "rounded px-3 py-1.5 text-sm transition-colors",
            active === t.key ? "bg-accent/15 font-medium text-accent" : "text-muted hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
