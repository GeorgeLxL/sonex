"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({
  items,
  className,
}: {
  items: { href: string; label: string }[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 pb-0.5 transition-colors",
              active
                ? "border-ink font-medium text-ink"
                : "border-transparent text-muted hover:text-ink",
              className,
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
