"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { submitInquiry, submitApplication, type PublicFormState } from "@/server/actions/public";
import { Input, Textarea, Select } from "@/components/ui";
import { getRecaptchaToken } from "@/lib/recaptcha";

const initial: PublicFormState = { ok: false };

/** Mono uppercase accent label, matching the design's form labels. */
const lbl = "mb-2 block font-mono text-[0.62rem] uppercase tracking-[0.2em] text-accent";
/** Solid accent submit button. */
const submitBtn =
  "inline-flex items-center justify-center gap-2 bg-accent px-8 py-3.5 text-sm font-medium uppercase tracking-[0.06em] text-accent-ink transition-colors hover:bg-accent/85 disabled:cursor-not-allowed disabled:opacity-50";

function FormSuccess({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-accent/30 bg-accent/[.04] p-8">
      <p className="font-display text-xl font-medium">{title}</p>
      <p className="mt-2 text-sm font-light leading-relaxed text-muted">{body}</p>
    </div>
  );
}

export function ContactForm() {
  const [state, action, pending] = useActionState(
    async (prev: PublicFormState, formData: FormData) => {
      const token = await getRecaptchaToken("contact");
      if (token) formData.set("recaptcha_token", token);
      return submitInquiry(prev, formData);
    },
    initial,
  );

  if (state.ok) {
    return (
      <FormSuccess
        title="Thank you."
        body="We've received your message and will be in touch within one business day."
      />
    );
  }

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={lbl}>Name *</label>
          <Input id="contact-name" name="name" required maxLength={200} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="contact-email" className={lbl}>Email *</label>
          <Input id="contact-email" name="email" type="email" required placeholder="your@email.com" />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-company" className={lbl}>Company</label>
          <Input id="contact-company" name="company" maxLength={200} placeholder="Your company name" />
        </div>
        <div>
          <label htmlFor="contact-phone" className={lbl}>Phone number</label>
          <Input id="contact-phone" name="phone" type="tel" maxLength={50} placeholder="+1 (555) 000-0000" />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className={lbl}>Tell us about your project *</label>
        <Textarea id="contact-message" name="message" required rows={5} maxLength={5000} placeholder="What are you building? What's the timeline and goals?" />
      </div>
      {/* Honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex items-start gap-2.5 text-sm font-light text-muted">
        <input type="checkbox" name="agree" required className="mt-0.5" />
        <span>
          By clicking the &ldquo;Send message&rdquo; button, you agree to our{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={submitBtn}>
        {pending ? "Sending…" : "Send message"} <ArrowRight size={14} />
      </button>
    </form>
  );
}

export function ApplicationForm({ jobs }: { jobs: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(
    async (prev: PublicFormState, formData: FormData) => {
      const token = await getRecaptchaToken("apply");
      if (token) formData.set("recaptcha_token", token);
      return submitApplication(prev, formData);
    },
    initial,
  );

  if (state.ok) {
    return (
      <FormSuccess
        title="Application received."
        body="Thanks for applying — we review every application and reply within a week."
      />
    );
  }

  return (
    <form action={action} className="space-y-6">
      <div>
        <label htmlFor="apply-position" className={lbl}>Position *</label>
        <Select id="apply-position" name="job_post_id" required defaultValue={jobs[0]?.id}>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="apply-name" className={lbl}>Name *</label>
          <Input id="apply-name" name="name" required maxLength={200} />
        </div>
        <div>
          <label htmlFor="apply-email" className={lbl}>Email *</label>
          <Input id="apply-email" name="email" type="email" required />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="apply-phone" className={lbl}>Phone</label>
          <Input id="apply-phone" name="phone" maxLength={50} />
        </div>
        <div>
          <label htmlFor="apply-resume" className={lbl}>Resume / portfolio URL</label>
          <Input id="apply-resume" name="resume_url" type="url" placeholder="https://…" />
        </div>
      </div>
      <div>
        <label htmlFor="apply-cover" className={lbl}>Cover letter</label>
        <Textarea id="apply-cover" name="cover_letter" rows={5} maxLength={5000} placeholder="Why this role, why you." />
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={submitBtn}>
        {pending ? "Submitting…" : "Submit application"} <ArrowRight size={14} />
      </button>
    </form>
  );
}
