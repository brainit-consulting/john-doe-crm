import Link from "next/link";
import { requireSession } from "@/lib/auth/roles";
import { listLeads, isGoingCold } from "@/lib/db/queries/leads";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Lead } from "@/lib/db/schema";

const STATUS_COLORS: Record<Lead["status"], string> = {
  new: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  won: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function StatusBadge({ status }: { status: Lead["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

function formatCurrency(value: string | null | undefined): string {
  if (!value) return "—";
  const n = parseFloat(value);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function LeadsPage() {
  const session = await requireSession();
  const leads = await listLeads({ session });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Link href="/leads/new">
          <Button>New lead</Button>
        </Link>
      </div>

      {leads.length === 0 ? (
        <Card>
          <div className="space-y-3 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              No leads yet. Add your first potential customer to start the sales cycle.
            </p>
            <Link href="/leads/new">
              <Button>Add your first lead</Button>
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
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-400">
                  Score
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-400">
                  Est. Value
                </th>
                <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-400">
                  Activity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {leads.map((lead) => {
                const cold = isGoingCold(lead);
                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:underline"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {lead.company ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {lead.score}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(lead.estValue)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cold ? (
                        <span
                          title="No activity in 14+ days"
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        >
                          Going cold
                        </span>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
