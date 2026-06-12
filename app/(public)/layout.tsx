import Link from "next/link";
import { Linkedin, Twitter, Github, Facebook, Instagram, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/public/nav-links";
import { RevealInit } from "@/components/reveal-init";
import { getContent, text } from "@/lib/content";

const SOCIAL_ICONS = [
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "twitter", label: "X", Icon: Twitter },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "github", label: "GitHub", Icon: Github },
];

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const content = await getContent(["site.name", "site.tagline", "contact.info", "site.social"]);
  const siteName = text(content, "site.name", "text", "Sonex-Digital");
  // No placeholder fallbacks — unset CMS fields simply don't render.
  const email = text(content, "contact.info", "email");
  const phone = text(content, "contact.info", "phone");
  const address = text(content, "contact.info", "address");
  // Only links configured in the CMS (site.social) are rendered.
  const socials = SOCIAL_ICONS.map((s) => ({
    ...s,
    url: text(content, "site.social", s.key),
  })).filter((s) => s.url.startsWith("http"));

  return (
    <div className="flex min-h-screen flex-col">
      <RevealInit />
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label={siteName} className="flex items-center">
            <Logo className="h-9" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <NavLinks items={NAV} />
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/contact"
              className="hidden rounded bg-accent px-3 py-2 text-sm font-medium text-accent-ink hover:opacity-90 sm:block"
            >
              Start a project
            </Link>
          </div>
        </div>
        <nav className="flex items-center gap-4 overflow-x-auto border-t border-line px-4 py-2 text-sm md:hidden">
          <NavLinks items={NAV} className="whitespace-nowrap" />
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-12">
          <div className="md:col-span-6">
            <Logo className="h-8" />
            <p className="mt-3 max-w-sm text-sm text-muted">
              {text(content, "site.tagline", "text")}
            </p>
            {socials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socials.map(({ key, label, Icon, url }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="rounded border border-accent/40 p-2.5 text-accent transition-colors hover:border-accent hover:bg-accent hover:text-white"
                  >
                    <Icon size={22} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Company</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-muted hover:text-ink">About</Link></li>
              <li><Link href="/services" className="text-muted hover:text-ink">Services</Link></li>
              <li><Link href="/work" className="text-muted hover:text-ink">Work</Link></li>
              <li><Link href="/blog" className="text-muted hover:text-ink">Blog</Link></li>
              <li><Link href="/careers" className="text-muted hover:text-ink">Careers</Link></li>
              <li><Link href="/contact" className="text-muted hover:text-ink">Contact</Link></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Contact</div>
            <ul className="space-y-3 text-sm text-muted">
              {email && (
                <li className="flex items-center gap-2.5">
                  <Mail size={16} className="shrink-0 text-accent" />
                  <a href={`mailto:${email}`} className="hover:text-ink hover:underline">
                    {email}
                  </a>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-2.5">
                  <Phone size={16} className="shrink-0 text-accent" />
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="hover:text-ink hover:underline">
                    {phone}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2.5">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-accent" />
                  {address}
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted">
            <span>© {new Date().getFullYear()} {siteName}. All rights reserved.</span>
            <span className="flex gap-4">
              <Link href="/privacy" className="hover:text-ink">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-ink">Terms of Service</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
