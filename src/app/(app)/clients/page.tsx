import Link from "next/link";
import { requireSession } from "@/lib/auth/roles";
import { listClients } from "@/lib/db/queries/clients";
import { Card } from "@/components/ui/card";

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await listClients({ session });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
      </div>

      {clients.length === 0 ? (
        <Card>
          <div className="space-y-3 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              No clients yet. Close a lead as won to create your first client.
            </p>
            <Link
              href="/leads"
              className="inline-flex items-center text-sm underline hover:no-underline"
            >
              Go to Leads
            </Link>
          </div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Company
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Billing email
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium hover:underline"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {client.company ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {client.billingEmail ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {client.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
