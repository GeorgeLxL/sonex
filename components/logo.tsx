import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Theme-aware brand logo: dark-text logo in light mode,
 * white-text logo in dark mode. Size via the height class.
 */
export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center">
      <Image
        src="/logo-dark.png"
        alt="Sonex-Digital"
        width={449}
        height={120}
        className={cn(className, "w-auto dark:hidden")}
      />
      <Image
        src="/logo-light.png"
        alt="Sonex-Digital"
        width={449}
        height={120}
        className={cn(className, "hidden w-auto dark:block")}
      />
    </span>
  );
}

/** Square icon mark (sidebar, compact spots). */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <Image
      src="/icon-192.png"
      alt="Sonex-Digital"
      width={192}
      height={192}
      className={cn(className, "shrink-0")}
    />
  );
}
