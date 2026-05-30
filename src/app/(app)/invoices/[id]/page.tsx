import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, effectiveRole } from "@/lib/auth/roles";
import { getInvoice } from "@/lib/db/queries/invoices";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AddLineForm } from "../_components/AddLineForm";
import { RemoveLineButton } from "../_components/RemoveLineButton";
import { InvoiceStatusControl } from "../_components/InvoiceStatusControl";
import { SetTaxForm } from "../_components/SetTaxForm";
import { SetDueDateForm } from "../_components/SetDueDateForm";
import { DeleteInvoiceButton } from "../_components/DeleteInvoiceButton";
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
  if (!value) return "$0.00";
  const n = parseFloat(value);
  if (isNaN(n)) return "$0.00";
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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const isOwner = effectiveRole(session) === "owner";

  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const lineTotal = (unitPrice: string, quantity: number) => {
    const n = parseFloat(unitPrice) * quantity;
    return isNaN(n) ? "$0.00" : new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/invoices" className="text-sm underline">
          ← Back to invoices
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{invoice.invoiceNumber}</h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[invoice.status]}`}
          >
            {STATUS_LABELS[invoice.status]}
          </span>
        </div>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          <Link href={`/clients/${invoice.clientId}`} className="hover:underline">
            {invoice.clientName ?? "Unknown client"}
          </Link>
          {invoice.projectId && invoice.projectTitle && (
            <>
              {" · "}
              <Link href={`/projects/${invoice.projectId}`} className="hover:underline">
                {invoice.projectTitle}
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Issue date</dt>
              <dd className="mt-0.5 font-medium">{formatDate(invoice.issueDate)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Due date</dt>
              <dd className="mt-0.5 font-medium">{formatDate(invoice.dueDate)}</dd>
            </div>
          </dl>
          <SetDueDateForm invoiceId={invoice.id} currentDueDate={invoice.dueDate} />
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.lines.length === 0 ? (
            <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
              No line items yet.
            </p>
          ) : (
            <div className="mb-4 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                    <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400">
                      Unit price
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400">
                      Line total
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {invoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2">{line.description}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{line.quantity}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {lineTotal(line.unitPrice, line.quantity)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <RemoveLineButton invoiceId={invoice.id} lineId={line.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AddLineForm invoiceId={invoice.id} />
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Subtotal</dt>
              <dd className="tabular-nums font-medium">{formatCurrency(invoice.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Tax</dt>
              <dd className="tabular-nums font-medium">{formatCurrency(invoice.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 dark:border-neutral-800">
              <dt className="font-semibold">Total</dt>
              <dd className="tabular-nums font-semibold">{formatCurrency(invoice.total)}</dd>
            </div>
          </dl>
          <SetTaxForm invoiceId={invoice.id} currentTax={invoice.tax} />
        </CardContent>
      </Card>

      {/* Status actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InvoiceStatusControl
            invoiceId={invoice.id}
            currentStatus={invoice.status}
          />

          {/* Download PDF */}
          <div className="flex items-center gap-3">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-transparent px-4 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Download PDF
            </a>
          </div>

          {/* Pay online — stub, post-MVP */}
          <div className="rounded-md border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Pay online
            </p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Online card payments are not available yet — coming post-MVP (spec §8).
            </p>
            <button
              type="button"
              disabled
              className="mt-2 inline-flex h-8 cursor-not-allowed items-center rounded-md border border-neutral-300 px-3 text-xs font-medium opacity-40 dark:border-neutral-700"
            >
              Pay online (coming soon)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Owner-only delete */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteInvoiceButton
              invoiceId={invoice.id}
              clientId={invoice.clientId}
              projectId={invoice.projectId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
