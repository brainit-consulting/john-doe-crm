import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  leads,
  clients,
  projects,
  invoices,
  activities,
  user,
  type Lead,
  type Project,
  type Activity,
} from "@/lib/db/schema";
import { effectiveRole, type AppSession } from "@/lib/auth/roles";

// ─── shared helpers ───────────────────────────────────────────────────────────

/** First/last day of the current month as YYYY-MM-DD (inclusive bounds). */
function monthBounds(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  const fmt = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };
  return { start: fmt(new Date(y, m, 1)), end: fmt(new Date(y, m + 1, 0)) };
}

/** Today as YYYY-MM-DD (matches the `date` column string shape). */
function todayISO(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ─── pipeline board ────────────────────────────────────────────────────────────

const LEAD_STATUSES: Lead["status"][] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

export type LeadStatusBucket = {
  status: Lead["status"];
  count: number;
  totalValue: number; // summed est_value (parsed from numeric strings)
};

/**
 * Count + summed est_value of leads in each status. Owner sees all leads;
 * rep/viewer see only their own (same scoping as listLeads). Every status is
 * present in the result (zero-filled) so the board renders a full funnel.
 */
export async function leadsByStatus({
  session,
}: {
  session: AppSession;
}): Promise<LeadStatusBucket[]> {
  const role = effectiveRole(session);

  const rows = await db
    .select({
      status: leads.status,
      count: sql<number>`count(*)::int`,
      // est_value is a nullable numeric string; SUM yields a numeric string.
      totalValue: sql<string>`coalesce(sum(${leads.estValue}), 0)`,
    })
    .from(leads)
    .where(role === "owner" ? undefined : eq(leads.ownerId, session.user.id))
    .groupBy(leads.status);

  const byStatus = new Map(rows.map((r) => [r.status, r]));
  return LEAD_STATUSES.map((status) => {
    const row = byStatus.get(status);
    return {
      status,
      count: row?.count ?? 0,
      totalValue: row ? parseFloat(row.totalValue) : 0,
    };
  });
}

// ─── active projects ───────────────────────────────────────────────────────────

export type ActiveProject = Pick<
  Project,
  "id" | "title" | "status" | "dueDate"
> & {
  clientName: string | null;
  overdue: boolean;
};

/**
 * Projects in proposed/active status, with an `overdue` flag when their due
 * date is before today. Owner sees all; rep/viewer see only projects whose
 * parent client they own (scoping via clients.ownerId).
 */
export async function activeProjects({
  session,
}: {
  session: AppSession;
}): Promise<ActiveProject[]> {
  const role = effectiveRole(session);
  const today = todayISO();

  const statusFilter = inArray(projects.status, ["proposed", "active"]);
  const where =
    role === "owner"
      ? statusFilter
      : and(statusFilter, eq(clients.ownerId, session.user.id));

  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      dueDate: projects.dueDate,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(where)
    .orderBy(desc(projects.dueDate));

  return rows.map((r) => ({
    ...r,
    overdue: r.dueDate != null && r.dueDate < today,
  }));
}

// ─── revenue this month ─────────────────────────────────────────────────────────

export type RevenueSummary = {
  invoiced: number; // Σ total of invoices issued this month
  paid: number; // Σ total of paid invoices issued this month
  outstanding: number; // Σ total of sent + overdue invoices (all-time)
};

/**
 * Revenue snapshot. "This month" is keyed off issue_date (the only invoice
 * date that tracks billing; there is no separate paid_at column). Outstanding
 * is the all-time balance still owed (sent + overdue). Owner sees all invoices;
 * rep/viewer see only invoices whose parent client they own.
 */
export async function revenueThisMonth({
  session,
}: {
  session: AppSession;
}): Promise<RevenueSummary> {
  const role = effectiveRole(session);
  const { start, end } = monthBounds();

  // Owner-scope by parent client ownership (mirrors listInvoices).
  const ownerScope =
    role === "owner" ? undefined : eq(clients.ownerId, session.user.id);

  const issuedThisMonth = and(
    sql`${invoices.issueDate} >= ${start}`,
    sql`${invoices.issueDate} <= ${end}`,
  );

  const [row] = await db
    .select({
      invoiced: sql<string>`coalesce(sum(${invoices.total}) filter (where ${issuedThisMonth}), 0)`,
      paid: sql<string>`coalesce(sum(${invoices.total}) filter (where ${issuedThisMonth} and ${invoices.status} = 'paid'), 0)`,
      outstanding: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} in ('sent', 'overdue')), 0)`,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(ownerScope);

  return {
    invoiced: parseFloat(row?.invoiced ?? "0"),
    paid: parseFloat(row?.paid ?? "0"),
    outstanding: parseFloat(row?.outstanding ?? "0"),
  };
}

// ─── recent activity feed ────────────────────────────────────────────────────────

export type RecentActivityItem = Pick<
  Activity,
  "id" | "subjectType" | "subjectId" | "kind" | "body" | "createdAt"
> & {
  authorName: string | null;
  /** Route to the activity's subject detail page, e.g. /leads/<id>. */
  href: string;
};

const SUBJECT_PATH: Record<Activity["subjectType"], string> = {
  lead: "/leads",
  client: "/clients",
  project: "/projects",
};

/**
 * Latest activities across leads/clients/projects, each with its author's name
 * and a link target for the subject. Owner sees all; rep/viewer see only
 * activities whose subject (lead/client/project) they own — resolved by
 * collecting the owned subject ids per type and filtering on (type, id).
 */
export async function recentActivity({
  session,
  limit = 10,
}: {
  session: AppSession;
  limit?: number;
}): Promise<RecentActivityItem[]> {
  const role = effectiveRole(session);

  let scope = undefined;
  if (role !== "owner") {
    const uid = session.user.id;
    // Owned subject ids per type (clients/projects scope via clients.ownerId).
    const [ownLeads, ownClients, ownProjects] = await Promise.all([
      db.select({ id: leads.id }).from(leads).where(eq(leads.ownerId, uid)),
      db.select({ id: clients.id }).from(clients).where(eq(clients.ownerId, uid)),
      db
        .select({ id: projects.id })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(eq(clients.ownerId, uid)),
    ]);

    const leadIds = ownLeads.map((r) => r.id);
    const clientIds = ownClients.map((r) => r.id);
    const projectIds = ownProjects.map((r) => r.id);

    const subjectIds = [...leadIds, ...clientIds, ...projectIds];
    if (subjectIds.length === 0) return [];

    // (subject_type, subject_id) IN (owned pairs). Because subject ids are
    // UUIDs they're unique across tables, so matching on subject_id alone is
    // sufficient; we keep the type filter implicit via the id set.
    scope = inArray(activities.subjectId, subjectIds);
  }

  const rows = await db
    .select({
      id: activities.id,
      subjectType: activities.subjectType,
      subjectId: activities.subjectId,
      kind: activities.kind,
      body: activities.body,
      createdAt: activities.createdAt,
      authorName: user.name,
    })
    .from(activities)
    .leftJoin(user, eq(activities.createdBy, user.id))
    .where(scope)
    .orderBy(desc(activities.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    href: `${SUBJECT_PATH[r.subjectType]}/${r.subjectId}`,
  }));
}
