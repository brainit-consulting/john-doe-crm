import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/roles";
import { getClient } from "@/lib/db/queries/clients";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClientForm } from "../_components/ClientForm";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSession();
  const client = await getClient(id);
  if (!client) notFound();

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

      {/* Projects placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Projects — coming in a later task.
          </p>
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
