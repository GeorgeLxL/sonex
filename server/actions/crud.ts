"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAuth, can } from "@/lib/auth";
import { ENTITIES, type FieldDef } from "@/lib/admin-entities";
import type { ActionResult } from "@/server/actions/projects";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function sanitize(fields: FieldDef[], raw: Record<string, unknown>): Record<string, unknown> | string {
  const row: Record<string, unknown> = {};
  for (const f of fields) {
    const v = raw[f.name];
    switch (f.type) {
      case "text": {
        const s = typeof v === "string" ? v.trim() : "";
        if (f.required && !s) return `${f.label} is required`;
        if (s.length > 1000) return `${f.label} too long`;
        row[f.name] = s || null;
        break;
      }
      case "textarea": {
        const s = typeof v === "string" ? v.trim() : "";
        if (f.required && !s) return `${f.label} is required`;
        if (s.length > 20000) return `${f.label} too long`;
        row[f.name] = s;
        break;
      }
      case "number": {
        const n = Number(v ?? 0);
        if (!Number.isFinite(n)) return `${f.label} must be a number`;
        row[f.name] = n;
        break;
      }
      case "bool":
        row[f.name] = v === true || v === "true" || v === "on";
        break;
      case "date": {
        const s = typeof v === "string" ? v.trim() : "";
        if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${f.label}: invalid date`;
        if (f.required && !s) return `${f.label} is required`;
        row[f.name] = s || null;
        break;
      }
      case "select": {
        const s = typeof v === "string" ? v : "";
        if (!f.options?.includes(s)) {
          if (f.required) return `${f.label} is required`;
          row[f.name] = f.options?.[0] ?? null;
        } else {
          row[f.name] = s;
        }
        break;
      }
      case "tags": {
        const s = typeof v === "string" ? v : "";
        row[f.name] = s
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 20);
        break;
      }
      case "image": {
        // The client uploads first; this receives the resulting URL.
        const s = typeof v === "string" ? v.trim() : "";
        if (s.length > 1000) return `${f.label}: invalid image URL`;
        row[f.name] = s || null;
        break;
      }
      case "ref": {
        const s = typeof v === "string" ? v.trim() : "";
        if (s && !/^[0-9a-f-]{36}$/i.test(s)) return `${f.label}: invalid reference`;
        row[f.name] = s || null;
        break;
      }
    }
  }
  return row;
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Upload a CMS image to the public media bucket; returns its URL. */
export async function uploadCmsImage(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; url?: string }> {
  const auth = await requireAuth();
  if (!can(auth, "website", "write")) return { ok: false, error: "No permission" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No file" };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, error: "Image must be JPG, PNG or WebP" };
  if (file.size > 1024 * 1024) return { ok: false, error: "Image must be under 1 MB" };

  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = supabaseAdmin();
  const path = `cms/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from("media")
    .upload(path, file, { contentType: file.type });
  if (error) return { ok: false, error: error.message };
  return { ok: true, url: admin.storage.from("media").getPublicUrl(path).data.publicUrl };
}

const REVALIDATE: Record<string, string[]> = {
  website: ["/", "/services", "/work", "/about", "/careers", "/contact", "/admin/website"],
  recruitment: ["/careers", "/admin/recruitment"],
  clients: ["/admin/clients"],
  finance: ["/admin/finance"],
  announcements: ["/workspace", "/admin", "/admin/announcements"],
  kb: ["/workspace", "/admin"],
  staff: ["/admin/staff"],
  attendance: ["/admin/attendance", "/workspace/attendance"],
};

function revalidateFor(perm: string) {
  for (const path of REVALIDATE[perm] ?? []) revalidatePath(path);
}

export async function upsertEntity(
  entityKey: string,
  id: string | null,
  raw: Record<string, unknown>,
): Promise<ActionResult> {
  const entity = ENTITIES[entityKey];
  if (!entity) return fail("Unknown entity");
  const auth = await requireAuth();
  if (!can(auth, entity.perm, "write")) return fail("No permission");

  const row = sanitize(entity.fields, raw);
  if (typeof row === "string") return fail(row);

  const db = await supabaseServer();
  if (!id && entity.authorField) row[entity.authorField] = auth.userId;
  const query = id
    ? db.from(entity.table).update(row).eq("id", id)
    : db.from(entity.table).insert(row);
  const { error } = await query;
  if (error) return fail(error.message);

  // New announcements also land in every staff member's notifications.
  if (!id && entityKey === "announcements") {
    const body = String(row.body ?? "").replace(/\s+/g, " ").slice(0, 140);
    await db.rpc("notify_all_staff", {
      p_type: "announcement",
      p_title: `Announcement: ${row.title}`,
      p_body: body,
      p_link: "/workspace",
    });
  }

  revalidateFor(entity.perm);
  return { ok: true };
}

export async function deleteEntity(entityKey: string, id: string): Promise<ActionResult> {
  const entity = ENTITIES[entityKey];
  if (!entity) return fail("Unknown entity");
  const auth = await requireAuth();
  if (!can(auth, entity.perm, "write")) return fail("No permission");

  const db = await supabaseServer();
  const { error } = await db.from(entity.table).delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateFor(entity.perm);
  return { ok: true };
}

/** Website page copy: site_content rows hold JSON per section. */
export async function saveSiteContent(key: string, json: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!can(auth, "website", "write")) return fail("No permission");
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return fail("Invalid JSON");
  }
  if (typeof value !== "object" || value === null) return fail("Content must be a JSON object");

  const db = await supabaseServer();
  const { error } = await db.from("site_content").upsert({ key, value });
  if (error) return fail(error.message);
  revalidateFor("website");
  return { ok: true };
}
