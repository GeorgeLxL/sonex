import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sonex-digital.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Cookie-free anon client — the sitemap only reads published content.
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const [cases, posts] = await Promise.all([
    db.from("case_studies").select("slug").eq("is_published", true),
    db.from("blog_posts").select("slug, published_at").eq("approval_status", "approved"),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/services",
    "/work",
    "/blog",
    "/about",
    "/careers",
    "/contact",
    "/privacy",
    "/terms",
  ].map((path) => ({ url: `${SITE_URL}${path}` }));

  return [
    ...staticPages,
    ...(cases.data ?? []).map((c) => ({ url: `${SITE_URL}/work/${c.slug}` })),
    ...(posts.data ?? []).map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.published_at ?? undefined,
    })),
  ];
}
