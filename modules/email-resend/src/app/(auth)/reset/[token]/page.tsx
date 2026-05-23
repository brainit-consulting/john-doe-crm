"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// Better-Auth's `/reset-password/:token` callback redirects the user to
// `${redirectTo}?token=<token>`, so the *real* token lives in the search
// params — the `[token]` path segment is just a routing anchor that gives
// us a stable URL shape. The `requestPasswordReset` call in `/reset` uses
// `redirectTo: "/reset/new"`, so users land here.
function ResetTokenForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const errorParam = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "INVALID_TOKEN" ? "This reset link is invalid or has expired." : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Missing reset token. Request a new reset link.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const res = await authClient.resetPassword({ newPassword: password, token });
    setSubmitting(false);
    if (res.error) {
      setError(res.error.message ?? "Could not reset password.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>Redirecting you to sign in…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Choose a new password (at least 8 characters) to finish resetting your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={submitting || !token}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
          <Link href="/reset" className="text-sm underline text-neutral-600 dark:text-neutral-400">
            Request a new reset link
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetTokenPage() {
  return (
    <Suspense fallback={null}>
      <ResetTokenForm />
    </Suspense>
  );
}
