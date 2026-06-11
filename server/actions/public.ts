"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export interface PublicFormState {
  ok: boolean;
  error?: string;
}

const inquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Valid email required"),
  company: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(10, "Tell us a bit more (10+ characters)").max(5000),
  agree: z.literal("on", {
    errorMap: () => ({ message: "Please agree to the Terms of Service and Privacy Policy" }),
  }),
  website: z.string().max(0).optional(), // honeypot — bots fill it
});

export async function submitInquiry(
  _prev: PublicFormState,
  formData: FormData,
): Promise<PublicFormState> {
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { website: _hp, agree: _agree, ...row } = parsed.data;

  const db = await supabaseServer();
  const { error } = await db.from("contact_inquiries").insert({
    name: row.name,
    email: row.email,
    company: row.company || null,
    phone: row.phone || null,
    message: row.message,
  });
  if (error) return { ok: false, error: "Could not send your message. Please try again." };
  return { ok: true };
}

const applicationSchema = z.object({
  job_post_id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Valid email required"),
  phone: z.string().trim().max(50).optional(),
  resume_url: z.string().trim().url("Resume link must be a valid URL").max(500).or(z.literal("")),
  cover_letter: z.string().trim().max(5000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitApplication(
  _prev: PublicFormState,
  formData: FormData,
): Promise<PublicFormState> {
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { website: _hp, ...row } = parsed.data;

  const db = await supabaseServer();

  // The job must exist and be open.
  const { data: job } = await db
    .from("job_posts")
    .select("id, title, is_open")
    .eq("id", row.job_post_id)
    .single();
  if (!job?.is_open) return { ok: false, error: "This position is no longer open." };

  const { error } = await db.from("candidates").insert({
    job_post_id: row.job_post_id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    resume_url: row.resume_url || null,
    cover_letter: row.cover_letter || null,
  });
  if (error) return { ok: false, error: "Could not submit your application. Please try again." };
  return { ok: true };
}
