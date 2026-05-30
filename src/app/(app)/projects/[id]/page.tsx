import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/roles";
import { getProject } from "@/lib/db/queries/projects";
import { getClient } from "@/lib/db/queries/clients";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProjectStatusControl } from "../_components/ProjectStatusControl";
import { ProjectEditForm } from "../_components/ProjectEditForm";

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
    </div>
  );
}
