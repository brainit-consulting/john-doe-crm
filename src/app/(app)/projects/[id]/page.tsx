import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/roles";
import { getProject } from "@/lib/db/queries/projects";
import { getClient } from "@/lib/db/queries/clients";
import { listInvoicesByProject } from "@/lib/db/queries/invoices";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProjectStatusControl } from "../_components/ProjectStatusControl";
import { ProjectEditForm } from "../_components/ProjectEditForm";
import { NewInvoiceButton } from "../../invoices/_components/NewInvoiceButton";
import { ActivityLog } from "@/components/activity/ActivityLog";
import type { Invoice } from "@/lib/db/schema";

const INVOICE_STATUS_COLORS: Record<Invoice["status"], string> = {
  draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const INVOICE_STATUS_LABELS: Record<Invoice["status"], string> = {
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
  // date columns come back as "YYYY-MM-DD" strings from Drizzle's date type
  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString();
}

const STATUS_LABELS: Record<string, string> = {
  proposed: "Proposed",
  active: "Active",
  on_hold: "On hold",
  delivered: "Delivered",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSession();

  const project = await getProject(id);
  if (!project) notFound();

  const client = await getClient(project.clientId);
  if (!client) notFound();

  const invoices = await listInvoicesByProject(id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/clients/${client.id}`} className="text-sm underline">
          ← Back to {client.name}
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {client.name}
            {client.company ? ` · ${client.company}` : ""}
          </p>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectStatusControl
            projectId={project.id}
            clientId={project.clientId}
            currentStatus={project.status}
          />
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Status</dt>
              <dd className="mt-0.5 font-medium">{STATUS_LABELS[project.status] ?? project.status}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Fee</dt>
              <dd className="mt-0.5 font-medium">{formatCurrency(project.fee)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Start date</dt>
              <dd className="mt-0.5 font-medium">{formatDate(project.startDate)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Due date</dt>
              <dd className="mt-0.5 font-medium">{formatDate(project.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Created</dt>
              <dd className="mt-0.5 font-medium">{project.createdAt.toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Client</dt>
              <dd className="mt-0.5 font-medium">
                <Link href={`/clients/${client.id}`} className="hover:underline">
                  {client.name}
                </Link>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Edit */}
      <Card>
        <CardHeader>
          <CardTitle>Edit project</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectEditForm
            projectId={project.id}
            clientId={project.clientId}
            initial={{
              title: project.title,
              description: project.description,
              startDate: project.startDate,
              dueDate: project.dueDate,
              fee: project.fee,
            }}
          />
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              No invoices yet.
            </p>
          ) : (
            <div className="mb-4 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-400">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Due
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS_COLORS[invoice.status]}`}
                        >
                          {INVOICE_STATUS_LABELS[invoice.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {invoice.dueDate ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <NewInvoiceButton clientId={project.clientId} projectId={project.id} />
        </CardContent>
      </Card>

      {/* Activity log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityLog subjectType="project" subjectId={project.id} />
        </CardContent>
      </Card>
    </div>
  );
}
