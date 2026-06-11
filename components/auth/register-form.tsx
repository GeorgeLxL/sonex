"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthFormState } from "@/server/actions/auth";
import { Button, Input, Label } from "@/components/ui";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});

  if (state.ok) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 p-6 text-sm">
        <p className="font-semibold text-success">Account created — pending approval.</p>
        <p className="mt-1 text-muted">
          An administrator has been notified. Once your account is approved you can{" "}
          <Link href="/login" className="text-accent hover:underline">
            sign in here
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Full name</Label>
        <Input name="full_name" required maxLength={200} placeholder="Jane Smith" />
      </div>
      <div>
        <Label>Work email</Label>
        <Input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </div>
      <div>
        <Label>Password (8+ characters)</Label>
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
