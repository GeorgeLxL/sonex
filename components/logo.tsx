import { cn } from "@/lib/utils";

/**
 * Theme-aware brand logo: dark-text logo in light mode,
 * white-text logo in dark mode. Size via the height class.
 */
export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.png"
        alt="Sonex-Digital"
        className={cn(className, "w-auto dark:hidden")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-light.png"
        alt="Sonex-Digital"
        className={cn(className, "hidden w-auto dark:block")}
      />
    </span>
  );
}

/** Square icon mark (sidebar, compact spots). */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icon-192.png" alt="Sonex-Digital" className={cn(className, "shrink-0")} />
  );
}
