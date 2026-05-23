import Link from "next/link";
import { requireSession } from "@/lib/auth/roles";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await requireSession();
  const userName = session.user.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {userName}.</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          You&apos;re signed in. Try the notes demo to see how features are built in this stack.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notes (demo feature)</CardTitle>
          <CardDescription>The reference feature — every pattern lives here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/notes">
            <Button>Open notes</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
