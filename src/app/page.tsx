import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/roles";

export default async function HomePage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">AgenticBuilder</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          A lean Next.js 16 quickstart. Auth, DB, and a working notes demo —
          modules optional.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/signup">
          <Button>Get started</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
      </div>
    </main>
  );
}
