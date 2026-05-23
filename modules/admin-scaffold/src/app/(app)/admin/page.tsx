import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getUserCount } from "@/lib/db/queries";

export default async function AdminLandingPage() {
  const totalUsers = await getUserCount();
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin overview</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Manage users and their roles. Owner-only by default.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {totalUsers === 1
              ? "1 user is signed up."
              : `${totalUsers} users are signed up.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/admin/users"
            className="text-sm font-medium underline underline-offset-4 hover:no-underline"
          >
            Manage users →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
