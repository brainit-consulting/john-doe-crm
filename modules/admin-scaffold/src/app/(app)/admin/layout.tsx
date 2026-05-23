import Link from "next/link";
import { requireRole } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate every /admin/* route. requireRole honors OWNER_EMAIL bypass.
  await requireRole("admin");
  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-4 border-b border-neutral-200 pb-3 text-sm dark:border-neutral-800">
        <Link href="/admin" className="font-semibold">
          Admin
        </Link>
        <Link
          href="/admin/users"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Users
        </Link>
      </nav>
      <div>{children}</div>
    </div>
  );
}
