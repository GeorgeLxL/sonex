import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Load site_content rows for the given keys with graceful fallbacks —
 * the public site must render even before the CMS is touched.
 */
export async function getContent(
  keys: string[],
): Promise<Record<string, Record<string, unknown>>> {
  const db = await supabaseServer();
  const { data } = await db.from("site_content").select("key, value").in("key", keys);
  const map: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) map[row.key] = row.value as Record<string, unknown>;
  return map;
}

export function text(
  map: Record<string, Record<string, unknown>>,
  key: string,
  field: string,
  fallback = "",
): string {
  const v = map[key]?.[field];
  return typeof v === "string" ? v : fallback;
}

export function list<T = unknown>(
  map: Record<string, Record<string, unknown>>,
  key: string,
  field: string,
): T[] {
  const v = map[key]?.[field];
  return Array.isArray(v) ? (v as T[]) : [];
}
