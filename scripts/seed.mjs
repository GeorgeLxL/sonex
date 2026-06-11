/**
 * Creates/syncs the COO (super admin) account from .env.local.
 * Prerequisite: run supabase/setup.sql in the Supabase SQL editor.
 *
 * - No COO yet  -> creates the account (SEED_COO_EMAIL / SEED_COO_PASSWORD)
 * - COO exists  -> syncs email + password to the env values
 * Everyone else self-registers at /register and is approved in /admin/staff.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---- load .env.local without a dotenv dependency ----------------
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* rely on real env vars */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey || url.includes("YOUR-PROJECT")) {
  console.error("Fill NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const email = process.env.SEED_COO_EMAIL || "coo@company.com";
const password = process.env.SEED_COO_PASSWORD || "change-me-coo-1234";
const fullName = process.env.SEED_COO_NAME || "Super Admin";

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const { data: roles, error: rolesError } = await db
    .from("roles")
    .select("id, name")
    .eq("name", "coo");
  if (rolesError) {
    console.error(`Database error: ${rolesError.message} (code ${rolesError.code ?? "?"})`);
    console.error(`URL in use: ${url}`);
    console.error("Check NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local,");
    console.error("and that supabase/setup.sql ran successfully.");
    process.exit(1);
  }
  if (!roles?.length) {
    console.error("Connected, but the roles table is empty - supabase/setup.sql");
    console.error("did not complete. Re-run the WHOLE file in the SQL editor and");
    console.error("check the editor output for an error message.");
    process.exit(1);
  }
  const cooRoleId = roles[0].id;

  const { data: deptRows } = await db
    .from("departments")
    .select("id")
    .eq("name", "Management")
    .limit(1);

  // ---- sync existing COO or create one -----------------------------
  const { data: coos } = await db
    .from("profiles")
    .select("id, email")
    .eq("role_id", cooRoleId)
    .order("created_at")
    .limit(1);
  const coo = coos?.[0];

  if (coo) {
    const attrs = { password };
    if (coo.email !== email) {
      attrs.email = email;
      attrs.email_confirm = true;
    }
    const { error } = await db.auth.admin.updateUserById(coo.id, attrs);
    if (error) {
      console.error(`! coo sync: ${error.message}`);
      process.exit(1);
    }
    if (coo.email !== email) {
      const { error: pErr } = await db.from("profiles").update({ email }).eq("id", coo.id);
      if (pErr) console.error(`! coo profile email: ${pErr.message}`);
    }
    console.log(
      `~ COO synced to env: ${email}` +
        (coo.email !== email ? ` (was ${coo.email})` : "") +
        ", password updated",
    );
  } else {
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      console.error(`! create user: ${error.message}`);
      process.exit(1);
    }
    const { error: profileError } = await db.from("profiles").insert({
      id: created.user.id,
      email,
      full_name: fullName,
      role_id: cooRoleId,
      department_id: deptRows?.[0]?.id ?? null,
      joined_at: new Date().toISOString().slice(0, 10),
    });
    if (profileError) {
      console.error(`! profile: ${profileError.message}`);
      await db.auth.admin.deleteUser(created.user.id);
      process.exit(1);
    }
    console.log(`+ COO created: ${email}`);
  }

  // ---- storage buckets (also seeded by setup.sql; harmless retry) ---
  for (const [name, isPublic] of [["files", false], ["media", true]]) {
    const { error: bucketErr } = await db.storage.createBucket(name, { public: isPublic });
    if (bucketErr && !/already exists/i.test(bucketErr.message)) {
      console.error(`! bucket ${name}: ${bucketErr.message}`);
    }
  }

  console.log("\nDone. Sign in at /login as the COO. Staff register at /register.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
