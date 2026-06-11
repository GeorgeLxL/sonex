# Sonex-Digital — Company Site + ERP

Next.js + Supabase platform with a public website and a role-based back office
(projects with drag-drop kanban/pipeline/priority matrix, milestones with Paid
tracking, attendance, payroll calculation, recruitment, CMS, staff blogging
with super-admin approval, realtime notifications, dark/light theme).

## Setup

1. **Create a Supabase project** at supabase.com.
2. In the Supabase **SQL editor**, run **`supabase/setup.sql`** — one file,
   everything: tables, RLS, triggers, roles/permissions, website content,
   storage buckets. Run it on an empty database. (The pre-run "enable RLS"
   dialog is fine — choose "Run and enable RLS".)
3. Copy `.env.example` → `.env.local`; fill the Supabase URL + keys
   (Project Settings → API) and your real `SEED_COO_EMAIL` /
   `SEED_COO_PASSWORD`.
4. Create the super admin:

   ```bash
   npm install
   npm run seed
   ```

   This creates **only the COO account** (or syncs an existing COO's
   email/password to the env values — re-run any time to rotate them).

5. `npm run dev` → http://localhost:3000 (public site), `/login` for the ERP.

## Staff onboarding

Staff **create their own accounts at `/register`** — new accounts start as
role `staff` and *inactive* ("pending approval"). The COO approves them in
`/admin/staff` (optionally setting role/department first). Inactive accounts
cannot sign in. All notifications are in-app (bell + optional Windows toasts);
there is no email sending.

## Access model (3 layers)

1. Middleware + layouts gate routes.
2. Every server action re-checks permissions (`lib/auth.ts` mirrors SQL `has_perm`).
3. Postgres RLS + triggers enforce the same rules at the database.

Rules encoded everywhere: role defaults → per-role grants → per-user overrides
(COO can extend/reduce anyone, incl. CEO); only CTO/COO move projects/milestones
to **Paid**; staff cannot move tasks to **Done** (they finish at Review; the
owner approves); task statuses roll up automatically to milestone/project;
**Archived = trash** (menu only, never a board column); personal todos are
owner-only (not even COO); staff blog posts publish only after **super admin
approval**.

## Notes

- Finance is record-keeping only; payroll is the one module that calculates
  (base − unpaid absence + adjustments), snapshotting results on confirm.
- Website content is editable in `/admin/website` (per-page tabs); "Page copy"
  values are JSON blobs — edit carefully.
- Deploy: push to GitHub → import in Vercel → set the same env vars
  (`NEXT_PUBLIC_SITE_URL` should be your real domain in production; the
  `SEED_*` vars are never needed on Vercel).
