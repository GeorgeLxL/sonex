import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth, homeFor } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Staff login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const auth = await getAuth();
  if (auth) redirect(homeFor(auth));
  const { next } = await searchParams;

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
          <h1 className="text-2xl font-bold">Staff login</h1>
          <p className="mt-1 text-sm text-muted">
            Sign in with the account your administrator created for you.
          </p>
          <div className="mt-6 rounded border border-line bg-surface p-6">
            <LoginForm next={next} />
          </div>
          <p className="mt-4 text-center text-sm text-muted">
            New here?{" "}
            <Link href="/register" className="text-accent hover:underline">
              Create your account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
