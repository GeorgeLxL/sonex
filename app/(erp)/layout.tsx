import { requireAuth, can, isAdminish, type AuthContext } from "@/lib/auth";
import { getContent, text } from "@/lib/content";
import { Sidebar, type NavItem } from "@/components/layout/sidebar";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/server/actions/auth";
import { LogOut } from "lucide-react";
import { initials } from "@/lib/utils";

function buildNav(auth: AuthContext): { title: string; items: NavItem[] }[] {
  const groups: { title: string; items: NavItem[] }[] = [];

  if (auth.role === "ceo") {
    groups.push({
      title: "Executive",
      items: [{ href: "/ceo", label: "Executive dashboard", icon: "ceo" }],
    });
  }

  if (auth.role !== "ceo" && isAdminish(auth)) {
    const items: NavItem[] = [{ href: "/admin", label: "Dashboard", icon: "dashboard" }];
    if (can(auth, "website")) items.push({ href: "/admin/website", label: "Website CMS", icon: "website" });
    if (can(auth, "projects")) items.push({ href: "/admin/projects", label: "Projects", icon: "projects" });
    if (can(auth, "staff")) items.push({ href: "/admin/staff", label: "Staff", icon: "staff" });
    if (can(auth, "attendance")) items.push({ href: "/admin/attendance", label: "Attendance", icon: "attendance" });
    if (can(auth, "recruitment")) items.push({ href: "/admin/recruitment", label: "Recruitment", icon: "recruitment" });
    if (can(auth, "announcements", "write")) items.push({ href: "/admin/announcements", label: "Announcements", icon: "announcements" });
    if (can(auth, "clients")) items.push({ href: "/admin/clients", label: "Clients", icon: "clients" });
    if (can(auth, "finance")) items.push({ href: "/admin/finance", label: "Finance", icon: "finance" });
    if (can(auth, "payroll")) items.push({ href: "/admin/payroll", label: "Payroll", icon: "payroll" });
    if (can(auth, "permissions")) items.push({ href: "/admin/settings", label: "Roles & permissions", icon: "settings" });
    groups.push({ title: "Admin", items });
  }

  if (auth.role !== "ceo") {
    groups.push({
      title: "Workspace",
      items: [
        { href: "/workspace", label: "My dashboard", icon: "dashboard" },
        { href: "/workspace/notifications", label: "Notifications", icon: "bell" },
        { href: "/workspace/tasks", label: "My project tasks", icon: "tasks" },
        { href: "/workspace/personal", label: "Personal todos", icon: "personal" },
        { href: "/workspace/projects", label: "My projects", icon: "projects" },
        { href: "/workspace/attendance", label: "Attendance", icon: "attendance" },
        { href: "/workspace/blog", label: "My blog posts", icon: "blog" },
        { href: "/workspace/payslips", label: "My payslips", icon: "payslips" },
        { href: "/workspace/profile", label: "Profile", icon: "profile" },
      ],
    });
  }

  return groups;
}

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  const content = await getContent(["site.name"]);
  const siteName = text(content, "site.name", "text", "Sonex-Digital");

  return (
    <div className="flex min-h-screen">
      <Sidebar groups={buildNav(auth)} siteName={siteName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-bg/80 px-4 backdrop-blur">
          <div className="md:hidden">
            <Logo className="h-6" />
          </div>
          <div className="hidden text-sm text-muted md:block" />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell userId={auth.userId} />
            <div className="mx-2 flex items-center gap-2">
              {auth.profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={auth.profile.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {initials(auth.profile.full_name)}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="text-sm font-medium leading-tight">{auth.profile.full_name}</div>
                <div className="text-xs leading-tight text-muted">{auth.roleDisplay}</div>
              </div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded p-2 text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                aria-label="Sign out"
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </header>
        <main className="w-full flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
