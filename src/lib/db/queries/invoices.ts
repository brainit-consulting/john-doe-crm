import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  invoices,
  invoiceLines,
  clients,
  projects,
  type Invoice,
  type InvoiceLine,
} from "@/lib/db/schema";
import { effectiveRole, type AppSession } from "@/lib/auth/roles";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Pads a number with leading zeros to at least 4 digits */
function padNum(n: number): string {
  return String(n).padStart(4, "0");
}

/** Format today as YYYY-MM-DD */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── types ──────────────────────────────────────────────────────────────────

export type InvoiceWithLines = Invoice & {
  lines: InvoiceLine[];
  invoiceNumber: string;
  clientName?: string;
  projectTitle?: string;
};

export type ListInvoicesOpts = {
  session: AppSession;
};

// ─── queries ─────────────────────────────────────────────────────────────────

/**
 * List all invoices. Owner sees all; rep/viewer see only invoices whose parent
 * client they own.
 */
export async function listInvoices({
  session,
}: ListInvoicesOpts): Promise<
  (Invoice & { invoiceNumber: string; clientName: string; projectTitle: string | null })[]
> {
  const role = effectiveRole(session);

  let rows: (Invoice & { clientName: string | null; projectTitle: string | null })[];

  if (role === "owner") {
    rows = await db
      .select({
        id: invoices.id,
        clientId: invoices.clientId,
        projectId: invoices.projectId,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        createdAt: invoices.createdAt,
        clientName: clients.name,
        projectTitle: projects.title,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .orderBy(desc(invoices.createdAt));
  } else {
    rows = await db
      .select({
        id: invoices.id,
        clientId: invoices.clientId,
        projectId: invoices.projectId,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        createdAt: invoices.createdAt,
        clientName: clients.name,
        projectTitle: projects.title,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(eq(clients.ownerId, session.user.id))
      .orderBy(desc(invoices.createdAt));
  }

  // Assign invoice numbers based on creation order (stable: ascending by createdAt index)
  return rows.map((r, i) => ({
    ...r,
    clientName: r.clientName ?? "Unknown",
    invoiceNumber: `INV-${padNum(i + 1)}`,
  }));
}

export async function listInvoicesByClient(
  clientId: string,
): Promise<(Invoice & { invoiceNumber: string; projectTitle: string | null })[]> {
  const rows = await db
    .select({
      id: invoices.id,
      clientId: invoices.clientId,
      projectId: invoices.projectId,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotal: invoices.subtotal,
      tax: invoices.tax,
      total: invoices.total,
      createdAt: invoices.createdAt,
      projectTitle: projects.title,
    })
    .from(invoices)
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.createdAt));

  // For per-client listing, number by position in the full table (use createdAt order)
  // We give a stable number based on row position in this result set
  return rows.map((r, i) => ({
    ...r,
    invoiceNumber: `INV-${padNum(i + 1)}`,
    projectTitle: r.projectTitle ?? null,
  }));
}

export async function listInvoicesByProject(
  projectId: string,
): Promise<(Invoice & { invoiceNumber: string })[]> {
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
    .orderBy(desc(invoices.createdAt));

  return rows.map((r, i) => ({
    ...r,
    invoiceNumber: `INV-${padNum(i + 1)}`,
  }));
}

export async function getInvoice(id: string): Promise<InvoiceWithLines | null> {
  const rows = await db
    .select({
      id: invoices.id,
      clientId: invoices.clientId,
      projectId: invoices.projectId,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotal: invoices.subtotal,
      tax: invoices.tax,
      total: invoices.total,
      createdAt: invoices.createdAt,
      clientName: clients.name,
      projectTitle: projects.title,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(eq(invoices.id, id))
    .limit(1);

  if (!rows[0]) return null;

  const lines = await db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, id));

  // Get invoice number by counting how many invoices exist up to and including this one
  const allInvoiceIds = await db
    .select({ id: invoices.id, createdAt: invoices.createdAt })
    .from(invoices)
    .orderBy(invoices.createdAt);

  const idx = allInvoiceIds.findIndex((r) => r.id === id);
  const invoiceNumber = `INV-${padNum(idx + 1)}`;

  const row = rows[0];
  return {
    id: row.id,
    clientId: row.clientId,
    projectId: row.projectId,
    status: row.status,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    createdAt: row.createdAt,
    lines,
    invoiceNumber,
    clientName: row.clientName ?? undefined,
    projectTitle: row.projectTitle ?? undefined,
  };
}

export async function createInvoice({
  clientId,
  projectId,
}: {
  clientId: string;
  projectId?: string | null;
}): Promise<Invoice> {
  const issueDate = todayISO();

  const [row] = await db
    .insert(invoices)
    .values({
      clientId,
      projectId: projectId ?? null,
      status: "draft",
      issueDate,
      dueDate: null,
      subtotal: "0",
      tax: "0",
      total: "0",
    })
    .returning();

  return row;
}

export async function addLine(
  invoiceId: string,
  {
    description,
    quantity,
    unitPrice,
  }: { description: string; quantity: number; unitPrice: string },
): Promise<InvoiceLine> {
  const [row] = await db
    .insert(invoiceLines)
    .values({
      invoiceId,
      description,
      quantity,
      unitPrice,
    })
    .returning();

  return row;
}

export async function removeLine(lineId: string): Promise<void> {
  await db.delete(invoiceLines).where(eq(invoiceLines.id, lineId));
}

export async function recomputeTotals(invoiceId: string): Promise<Invoice | null> {
  const lines = await db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId));

  const subtotal = lines.reduce((sum, line) => {
    return sum + parseFloat(line.unitPrice) * line.quantity;
  }, 0);

  // Fetch existing tax
  const existing = await db
    .select({ tax: invoices.tax })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  const tax = existing[0] ? parseFloat(existing[0].tax) : 0;
  const total = subtotal + tax;

  const [updated] = await db
    .update(invoices)
    .set({
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return updated ?? null;
}

export async function setInvoiceStatus(
  id: string,
  status: Invoice["status"],
): Promise<Invoice | null> {
  const [row] = await db
    .update(invoices)
    .set({ status })
    .where(eq(invoices.id, id))
    .returning();

  return row ?? null;
}

export async function setInvoiceTax(
  id: string,
  tax: string,
): Promise<Invoice | null> {
  const taxNum = parseFloat(tax);
  if (isNaN(taxNum)) return null;

  // Recalculate total
  const existing = await db
    .select({ subtotal: invoices.subtotal })
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!existing[0]) return null;

  const subtotal = parseFloat(existing[0].subtotal);
  const total = subtotal + taxNum;

  const [row] = await db
    .update(invoices)
    .set({ tax: taxNum.toFixed(2), total: total.toFixed(2) })
    .where(eq(invoices.id, id))
    .returning();

  return row ?? null;
}

export async function setInvoiceDueDate(
  id: string,
  dueDate: string | null,
): Promise<Invoice | null> {
  const [row] = await db
    .update(invoices)
    .set({ dueDate })
    .where(eq(invoices.id, id))
    .returning();

  return row ?? null;
}

export async function deleteInvoice(id: string): Promise<void> {
  // Lines are deleted via cascade (FK on invoiceLines.invoiceId)
  await db.delete(invoices).where(eq(invoices.id, id));
}
