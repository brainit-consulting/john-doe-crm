import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/roles";
import { getClient } from "@/lib/db/queries/clients";
import { listProjectsByClient } from "@/lib/db/queries/projects";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClientForm } from "../_components/ClientForm";
import { AddProjectForm } from "../../projects/_components/AddProjectForm";

const PROJECT_STATUS_LABELS: Record<string, string> = {
  proposed: "Proposed",
  active: "Active",
  on_hold: "On hold",
  delivered: "Delivered",
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  proposed: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
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

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSession();
  const client = await getClient(id);
  if (!client) notFound();
  const projects = await listProjectsByClient(id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm underline">
          ← Back to clients
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          {client.company && (
            <p className="text-neutral-600 dark:text-neutral-400">{client.company}</p>
          )}
        </div>
      </div>

      {/* Contact & billing details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact &amp; billing</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Billing email</dt>
              <dd className="mt-0.5 font-medium">
                {client.billingEmail ? (
                  <a href={`mailto:${client.billingEmail}`} className="hover:underline">
                    {client.billingEmail}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Address</dt>
              <dd className="mt-0.5 font-medium">{client.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Created</dt>
              <dd className="mt-0.5 font-medium">{client.createdAt.toLocaleDateString()}</dd>
            </div>
            {client.leadId && (
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Origin lead</dt>
                <dd className="mt-0.5 font-medium">
                  <Link href={`/leads/${client.leadId}`} className="hover:underline">
                    View lead
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          <ClientForm
            clientId={client.id}
            initial={{
              name: client.name,
              company: client.company,
              billingEmail: client.billingEmail,
              address: client.address,
            }}
          />
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              No projects yet.
            </p>
          ) : (
            <div className="mb-4 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Due date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Fee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium hover:underline"
                        >
                          {project.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PROJECT_STATUS_COLORS[project.status]}`}
                        >
                          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {project.dueDate ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {formatCurrency(project.fee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AddProjectForm clientId={client.id} />
        </CardContent>
      </Card>

      {/* Invoices placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Invoices — coming in a later task.
          </p>
        </CardContent>
      </Card>

      {/* Activity log placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Activity log — coming in a later task.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
