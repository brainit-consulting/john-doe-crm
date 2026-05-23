"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    // Better-Auth always returns success here (even for unknown emails) to
    // mitigate user-enumeration. The actual send happens server-side via
    // the sendResetPassword hook wired up in src/lib/auth/server.ts.
    // After clicking the email link, Better-Auth redirects the user to
    // `${redirectTo}?token=<token>`. Our `/reset/new` page reads that
    // search param and lets the user set a new password.
    const res = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset/new",
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error.message ?? "Could not send reset email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            If an account exists for <strong>{email}</strong>, a password-reset link is on its way.
            Click the link in the email to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm underline">← Back to sign in</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Enter the email you signed up with and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
          <Link href="/login" className="text-sm underline text-neutral-600 dark:text-neutral-400">
            ← Back to sign in
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
