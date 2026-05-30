import Link from "next/link";
import { requireSession } from "@/lib/auth/roles";
import {
  leadsByStatus,
  activeProjects,
  revenueThisMonth,
  recentActivity,
  type LeadStatusBucket,
} from "@/lib/db/queries/dashboard";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Lead, Project, Activity } from "@/lib/db/schema";

// ─── formatting ────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

function timeAgo(d: Date): string {
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

// ─── pipeline board ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

const STATUS_ACCENT: Record<Lead["status"], string> = {
  new: "border-neutral-300 dark:border-neutral-700",
  contacted: "border-blue-400 dark:border-blue-600",
  qualified: "border-purple-400 dark:border-purple-600",
  won: "border-green-500 dark:border-green-600",
  lost: "border-red-400 dark:border-red-600",
};

function PipelineCard({ bucket }: { bucket: LeadStatusBucket }) {
  return (
    <Link
      href={`/leads?status=${bucket.status}`}
      className={`block rounded-lg border-l-4 ${STATUS_ACCENT[bucket.status]} border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {STATUS_LABELS[bucket.status]}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{bucket.count}</div>
      <div className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400 tabular-nums">
        {formatCurrency(bucket.totalValue)}
      </div>
    </Link>
  );
}

// ─── project status badge ──────────────────────────────────────────────────────

const PROJECT_STATUS_LABELS: Record<Project["status"], string> = {
  proposed: "Proposed",
  active: "Active",
  on_hold: "On hold",
  delivered: "Delivered",
};

const PROJECT_STATUS_COLORS: Record<Project["status"], string> = {
  proposed: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

// ─── activity kind label ───────────────────────────────────────────────────────

const ACTIVITY_VERB: Record<Activity["kind"], string> = {
  call: "logged a call",
  email: "sent an email",
  meeting: "held a meeting",
  note: "added a note",
  stage_change: "changed the stage",
};

const SUBJECT_LABEL: Record<Activity["subjectType"], string> = {
  lead: "lead",
  client: "client",
  project: "project",
};

// ─── page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await requireSession();

  const [pipeline, projects, revenue, activity] = await Promise.all([
    leadsByStatus({ session }),
    activeProjects({ session }),
    revenueThisMonth({ session }),
    recentActivity({ session, limit: 10 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Good morning, {session.user.name}.
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Here&apos;s your pipeline, active work, and money, all in one place.
        </p>
      </div>

      {/* Pipeline board */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {pipeline.map((bucket) => (
            <PipelineCard key={bucket.status} bucket={bucket} />
          ))}
        </div>
      </section>

      {/* Revenue this month */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Revenue</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Invoiced this month</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(revenue.invoiced)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Paid this month</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-green-600 dark:text-green-400">
                {formatCurrency(revenue.paid)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Outstanding</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-amber-600 dark:text-amber-400">
                {formatCurrency(revenue.outstanding)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active projects */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Active projects</h2>
          {projects.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                No proposed or active projects right now.
              </p>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                    <th className="px-4 py-2.5 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Project
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-neutral-600 dark:text-neutral-400">
                      Due
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {projects.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.title}
                        </Link>
                        {p.clientName ? (
                          <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                            {p.clientName}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_COLORS[p.status]}`}
                        >
                          {PROJECT_STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                        <span className="inline-flex items-center gap-1.5">
                          {formatDate(p.dueDate)}
                          {p.overdue ? (
                            <span
                              title="Past due date"
                              className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            >
                              Overdue
                            </span>
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          {activity.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                No activity logged yet.
              </p>
            </Card>
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {activity.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={a.href}
                      className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {a.authorName ?? "Someone"}
                          </span>{" "}
                          <span className="text-neutral-600 dark:text-neutral-400">
                            {ACTIVITY_VERB[a.kind]} on a {SUBJECT_LABEL[a.subjectType]}
                          </span>
                        </p>
                        {a.body ? (
                          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {a.body}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs text-neutral-400 dark:text-neutral-500">
                        {timeAgo(a.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
