"use client";

import { useActionState } from "react";
import { signIn, type AuthFormState } from "@/server/actions/auth";
import { Button, Input, Label } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" required autoComplete="current-password" />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
