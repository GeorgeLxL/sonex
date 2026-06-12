"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Enables scroll-reveal: observes [data-reveal] sections and fades
 *  them in as they enter the viewport. Re-scans on route changes. */
export function RevealInit() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add("rv");
    const els = document.querySelectorAll("[data-reveal]:not(.in)");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
