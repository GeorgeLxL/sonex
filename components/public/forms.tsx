"use client";

import { useActionState } from "react";
import { submitInquiry, submitApplication, type PublicFormState } from "@/server/actions/public";
import { Button, Input, Textarea, Label, Select } from "@/components/ui";

const initial: PublicFormState = { ok: false };

export function ContactForm() {
  const [state, action, pending] = useActionState(submitInquiry, initial);

  if (state.ok) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 p-6 text-sm">
        <p className="font-semibold text-success">Message sent.</p>
        <p className="mt-1 text-muted">We will get back to you within one business day.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Name *</Label>
          <Input name="name" required maxLength={200} placeholder="Jane Smith" />
        </div>
        <div>
          <Label>Email *</Label>
          <Input name="email" type="email" required placeholder="jane@company.com" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Company</Label>
          <Input name="company" maxLength={200} placeholder="Acme Inc." />
        </div>
        <div>
          <Label>Phone number</Label>
          <Input name="phone" type="tel" maxLength={50} placeholder="+1 (555) 000-0000" />
        </div>
      </div>
      <div>
        <Label>What are you building? *</Label>
        <Textarea name="message" required rows={5} maxLength={5000} placeholder="A few sentences about your project, timeline and goals." />
      </div>
      {/* Honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex items-start gap-2.5 text-sm text-muted">
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
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}

export function ApplicationForm({ jobs }: { jobs: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(submitApplication, initial);

  if (state.ok) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 p-6 text-sm">
        <p className="font-semibold text-success">Application received.</p>
        <p className="mt-1 text-muted">Thanks for applying — we review every application and reply within a week.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Position *</Label>
        <Select name="job_post_id" required defaultValue={jobs[0]?.id}>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Name *</Label>
          <Input name="name" required maxLength={200} />
        </div>
        <div>
          <Label>Email *</Label>
          <Input name="email" type="email" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Phone</Label>
          <Input name="phone" maxLength={50} />
        </div>
        <div>
          <Label>Resume / portfolio URL</Label>
          <Input name="resume_url" type="url" placeholder="https://…" />
        </div>
      </div>
      <div>
        <Label>Cover letter</Label>
        <Textarea name="cover_letter" rows={5} maxLength={5000} placeholder="Why this role, why you." />
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
