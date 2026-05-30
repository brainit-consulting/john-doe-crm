import Link from "next/link";
import { getUserCount, listUsers } from "@/lib/db/queries";
import { RoleSelect } from "./_components/RoleSelect";

const PAGE_SIZE = 20;

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const parsed = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const total = await getUserCount();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const users = await listUsers(safePage, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Showing page {safePage} of {totalPages} ({total} total).
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Created at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No users on this page.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">
                    <RoleSelect userId={u.id} currentRole={(u.role === "rep" ? "rep" : "viewer")} />
                  </td>
                  <td className="px-4 py-3">
                    {u.emailVerified ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
                    ) : (
                      <span className="text-neutral-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {formatDate(new Date(u.createdAt))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        {safePage > 1 ? (
          <Link
            href={`/admin/users?page=${safePage - 1}`}
            className="text-neutral-700 underline underline-offset-4 hover:no-underline dark:text-neutral-200"
          >
            ← Previous
          </Link>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-600">← Previous</span>
        )}
        {safePage < totalPages ? (
          <Link
            href={`/admin/users?page=${safePage + 1}`}
            className="text-neutral-700 underline underline-offset-4 hover:no-underline dark:text-neutral-200"
          >
            Next →
          </Link>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-600">Next →</span>
        )}
      </div>
    </div>
  );
}
