import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePerm, can } from "@/lib/auth";
import { ENTITIES } from "@/lib/admin-entities";
import { CrudPanel, type Row } from "@/components/admin/crud-panel";
import { TabNav } from "@/components/admin/tab-nav";
import { SiteContentEditor } from "@/components/admin/site-content-editor";
import { LeadershipToggles } from "@/components/admin/leadership-toggles";
import { BlogReview, type PendingPost } from "@/components/admin/blog-review";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Website CMS" };

const TABS = [
  { key: "home", label: "Home" },
  { key: "services", label: "Services" },
  { key: "about", label: "About" },
  { key: "careers", label: "Careers" },
  { key: "contact", label: "Contact" },
  { key: "legal", label: "Legal" },
  { key: "capabilities", label: "Capabilities" },
  { key: "case_studies", label: "Case studies" },
  { key: "testimonials", label: "Testimonials" },
  { key: "blog_posts", label: "Blog" },
  { key: "faqs", label: "FAQs" },
];

/** site_content keys editable per page tab. Home exposes only the
 *  necessities — all other home sections come from sub-page data. */
const PAGE_KEYS: Record<string, string[]> = {
  home: ["site.name", "site.tagline", "site.social", "home.hero"],
  services: ["services.process"],
  about: ["about.story", "about.mission", "about.values", "about.stats"],
  careers: ["careers.why", "careers.benefits", "careers.process"],
  contact: ["contact.info"],
  legal: ["legal.privacy", "legal.terms"],
};

const COLUMNS: Record<string, { key: string; label: string }[]> = {
  services: [
    { key: "title", label: "Title" },
    { key: "slug", label: "Slug" },
    { key: "sort_order", label: "Order" },
    { key: "is_published", label: "Published" },
  ],
  capabilities: [
    { key: "title", label: "Title" },
    { key: "icon", label: "Icon" },
    { key: "sort_order", label: "Order" },
    { key: "is_published", label: "Published" },
  ],
  case_studies: [
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    { key: "client_name", label: "Client" },
    { key: "is_published", label: "Published" },
  ],
  testimonials: [
    { key: "author", label: "Author" },
    { key: "company", label: "Company" },
    { key: "is_published", label: "Published" },
  ],
  blog_posts: [
    { key: "title", label: "Title" },
    { key: "author_name", label: "Author" },
    { key: "approval_status", label: "Status" },
  ],
  faqs: [
    { key: "question", label: "Question" },
    { key: "sort_order", label: "Order" },
    { key: "is_published", label: "Published" },
  ],
};

export default async function WebsiteCmsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await requirePerm("website", "read");
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "home";
  const db = await supabaseServer();
  const canWrite = can(auth, "website", "write");

  const pageKeys = PAGE_KEYS[tab];
  let contentEditor: React.ReactNode = null;
  let leadershipToggles: React.ReactNode = null;

  if (pageKeys) {
    const { data } = await db
      .from("site_content")
      .select("key, value")
      .in("key", pageKeys)
      .order("key");
    contentEditor = <SiteContentEditor items={data ?? []} />;

    if (tab === "about" && canWrite) {
      const { data: leadership } = await db
        .from("site_content")
        .select("value")
        .eq("key", "about.leadership")
        .maybeSingle();
      const value = (leadership?.value as { show_ceo?: boolean; show_cto?: boolean }) ?? {};
      leadershipToggles = (
        <LeadershipToggles
          value={{ show_ceo: value.show_ceo ?? true, show_cto: value.show_cto ?? true }}
        />
      );
    }
  }

  // Blog tab: super-admin review queue for staff posts.
  let reviewQueue: React.ReactNode = null;
  if (tab === "blog_posts" && canWrite) {
    const { data: pending } = await db
      .from("blog_posts")
      .select("id, title, excerpt, body, cover_url, author_name, published_at")
      .eq("approval_status", "pending")
      .order("published_at");
    reviewQueue = <BlogReview posts={(pending ?? []) as PendingPost[]} />;
  }

  // Tabs backed by an entity table (services has BOTH copy + entities).
  const entityKey = ENTITIES[tab] ? tab : null;
  let entityPanel: React.ReactNode = null;
  if (entityKey) {
    const entity = ENTITIES[entityKey];
    const { data } = await db
      .from(entity.table)
      .select("*")
      .order(entity.orderBy ?? "created_at", { ascending: entity.orderBy !== "published_at" });

    // Case studies reference a service.
    let refOptions: Record<string, { value: string; label: string }[]> | undefined;
    if (entityKey === "case_studies") {
      const { data: services } = await db.from("services").select("id, title").order("sort_order");
      refOptions = {
        service_id: (services ?? []).map((s) => ({ value: s.id, label: s.title })),
      };
    }

    entityPanel = (
      <CrudPanel
        entityKey={entityKey}
        entity={entity}
        rows={(data ?? []) as Row[]}
        columns={COLUMNS[entityKey]}
        canWrite={canWrite}
        refOptions={refOptions}
      />
    );
  }

  return (
    <div>
      <PageTitle title="Website CMS" sub="Everything on the public site is managed here." />
      <TabNav base="/admin/website" tabs={TABS} active={tab} />
      {leadershipToggles}
      {reviewQueue}
      {contentEditor}
      {entityPanel && pageKeys && <div className="mt-6">{entityPanel}</div>}
      {entityPanel && !pageKeys && entityPanel}
    </div>
  );
}
