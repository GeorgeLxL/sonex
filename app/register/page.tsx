import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth, homeFor } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const auth = await getAuth();
  if (auth) redirect(homeFor(auth));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Back to site
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-sm">
          <Logo className="mb-6 h-10" />
          <h1 className="text-2xl font-bold">Create your staff account</h1>
          <p className="mt-1 text-sm text-muted">
            New accounts need approval from an administrator before signing in.
          </p>
          <div className="mt-6 rounded border border-line bg-surface p-6">
            <RegisterForm />
          </div>
          <p className="mt-4 text-center text-sm text-muted">
            Already approved?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
