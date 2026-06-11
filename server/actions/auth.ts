"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuth, homeFor } from "@/lib/auth";

export interface AuthFormState {
  error?: string;
  ok?: boolean;
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  next: z.string().optional(),
});

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const db = await supabaseServer();
  const { error } = await db.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "Wrong email or password." };

  const auth = await getAuth();
  if (!auth) {
    await db.auth.signOut();
    return { error: "This account is inactive. Contact your administrator." };
  }

  const next = parsed.data.next;
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(auth));
}

const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  website: z.string().max(0).optional(), // honeypot
});

/**
 * Self-service staff registration. Accounts start as role `staff` and
 * INACTIVE — COO/HR approves them in /admin/staff before they can sign in.
 * Only the COO account is seeded.
 */
export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const admin = supabaseAdmin();
  const { data: role } = await admin.from("roles").select("id").eq("name", "staff").single();
  if (!role) return { error: "Setup incomplete — ask your administrator." };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (error) {
    return {
      error: /already|exists|registered/i.test(error.message)
        ? "This email is already registered."
        : error.message,
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    role_id: role.id,
    is_active: false, // pending approval
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not create your account. Please try again." };
  }

  // Tell the approvers (COO + HR) someone is waiting.
  const { data: approvers } = await admin
    .from("profiles")
    .select("id, roles!inner(name)")
    .eq("is_active", true)
    .in("roles.name", ["coo", "hr"]);
  for (const a of approvers ?? []) {
    await admin.from("notifications").insert({
      user_id: a.id,
      type: "staff_pending",
      title: "New staff registration",
      body: `${parsed.data.full_name} (${parsed.data.email}) is waiting for approval.`,
      link: "/admin/staff",
    });
  }

  return { ok: true };
}

export async function signOut() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/login");
}
