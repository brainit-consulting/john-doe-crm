"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ResetPage() {
  // Password reset flow ships with the email-resend module (Plan B), which
  // wires Better-Auth's email-verification hook. Until then this is a stub.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Password reset by email lands with the <code>email-resend</code> module.
          For now, contact the project owner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className="text-sm underline">← Back to sign in</Link>
      </CardContent>
    </Card>
  );
}
