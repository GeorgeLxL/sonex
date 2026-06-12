"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  Globe,
  FolderKanban,
  Users,
  CalendarCheck,
  UserPlus,
  Building2,
  Wallet,
  BadgeDollarSign,
  Settings,
  ListTodo,
  ClipboardList,
  User,
  Receipt,
  Crown,
  Newspaper,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  website: Globe,
  projects: FolderKanban,
  staff: Users,
  attendance: CalendarCheck,
  recruitment: UserPlus,
  clients: Building2,
  finance: Wallet,
  payroll: BadgeDollarSign,
  settings: Settings,
  tasks: ListTodo,
  personal: ClipboardList,
  profile: User,
  payslips: Receipt,
  ceo: Crown,
  blog: Newspaper,
  announcements: Megaphone,
  bell: Bell,
};

export function Sidebar({
  groups,
  siteName,
}: {
  groups: { title: string; items: NavItem[] }[];
  siteName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-line bg-surface md:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="flex h-14 items-center border-b border-line px-4">
          <Link href="/" aria-label={siteName} className="flex items-center">
            <Logo className="h-7" />
          </Link>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {g.title}
              </div>
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/admin" &&
                      item.href !== "/workspace" &&
                      pathname.startsWith(item.href + "/")) ||
                    (item.href === "/admin" && pathname === "/admin") ||
                    (item.href === "/workspace" && pathname === "/workspace");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm transition-all",
                          active
                            ? "bg-accent/10 font-medium text-accent before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent before:content-['']"
                            : "text-muted hover:translate-x-0.5 hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        <Icon size={16} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
