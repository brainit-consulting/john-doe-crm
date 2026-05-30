import Link from "next/link";
import { requireSession } from "@/lib/auth/roles";
import { listInvoices } from "@/lib/db/queries/invoices";
import type { Invoice } from "@/lib/db/schema";

const STATUS_COLORS: Record<Invoice["status"], string> = {
  draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_LABELS: Record<Invoice["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

function formatCurrency(value: string | null | undefined): string {
  if (!value) return "—";
  const n = parseFloat(value);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString();
}

export default async function InvoicesPage() {
  const session = await requireSession();
  const invoices = await listInvoices({ session });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 p-8 text-center dark:border-neutral-800">
          <p className="text-neutral-600 dark:text-neutral-400">
            No invoices yet. Create one from a client or project page.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-400">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Issued
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Due
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-medium hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    <Link
                      href={`/clients/${invoice.clientId}`}
                      className="hover:underline"
                    >
                      {invoice.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[invoice.status]}`}
                    >
                      {STATUS_LABELS[invoice.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {formatDate(invoice.dueDate)}
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
