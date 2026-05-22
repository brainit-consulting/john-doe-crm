import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  // Layout already redirects when null; this assertion is just for the types.
  const userName = session?.user.name ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {userName}.</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          You're signed in. Try the notes demo to see how features are built in this stack.
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
