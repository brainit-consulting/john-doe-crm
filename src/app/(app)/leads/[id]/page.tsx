import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/roles";
import { getLead, isGoingCold } from "@/lib/db/queries/leads";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusControl } from "../_components/StatusControl";
import { ScoreControl } from "../_components/ScoreControl";
import { LeadForm } from "../_components/LeadForm";
import { ConvertToClientButton } from "../_components/ConvertToClientButton";
import { ActivityLog } from "@/components/activity/ActivityLog";

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

const SOURCE_LABELS: Record<string, string> = {
  web: "Web",
  referral: "Referral",
  event: "Event",
  cold: "Cold outreach",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSession();
  const lead = await getLead(id);
  if (!lead) notFound();

  const cold = isGoingCold(lead);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm underline">
          ← Back to leads
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{lead.name}</h1>
            {lead.company && (
              <p className="text-neutral-600 dark:text-neutral-400">{lead.company}</p>
            )}
          </div>
          {cold && (
            <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Going cold
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusControl leadId={lead.id} currentStatus={lead.status} />
        </CardContent>
      </Card>

      {/* Score */}
      <Card>
        <CardHeader>
          <CardTitle>Lead score</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreControl leadId={lead.id} currentScore={lead.score} />
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
              <dt className="text-neutral-500 dark:text-neutral-400">Email</dt>
              <dd className="mt-0.5 font-medium">
                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="hover:underline"
                  >
                    {lead.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Phone</dt>
              <dd className="mt-0.5 font-medium">{lead.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Source</dt>
              <dd className="mt-0.5 font-medium">{SOURCE_LABELS[lead.source] ?? lead.source}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Est. value</dt>
              <dd className="mt-0.5 font-medium">{formatCurrency(lead.estValue)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Created</dt>
              <dd className="mt-0.5 font-medium">{lead.createdAt.toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Last activity</dt>
              <dd className="mt-0.5 font-medium">{lead.lastActivityAt.toLocaleDateString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Edit */}
      <Card>
        <CardHeader>
          <CardTitle>Edit lead</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadForm
            mode="edit"
            leadId={lead.id}
            initial={{
              name: lead.name,
              company: lead.company,
              email: lead.email,
              phone: lead.phone,
              source: lead.source,
              estValue: lead.estValue,
            }}
          />
        </CardContent>
      </Card>

      {/* Convert to client */}
      {(lead.status === "qualified" || lead.status === "won") && (
        <Card>
          <CardHeader>
            <CardTitle>Convert to client</CardTitle>
          </CardHeader>
          <CardContent>
            {lead.status === "won" ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                This lead has already been converted.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Mark this lead as won and create a client record.
                </p>
                <ConvertToClientButton leadId={lead.id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityLog subjectType="lead" subjectId={lead.id} />
        </CardContent>
      </Card>
    </div>
  );
}
