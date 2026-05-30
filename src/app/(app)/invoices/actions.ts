"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/roles";
import {
  createInvoice,
  addLine,
  removeLine,
  recomputeTotals,
  setInvoiceStatus,
  setInvoiceTax,
  setInvoiceDueDate,
  deleteInvoice,
} from "@/lib/db/queries/invoices";
import type { Invoice } from "@/lib/db/schema";

export type InvoiceActionResult =
  | { ok: true; invoiceId?: string }
  | { ok: false; error: string };

// ─── create ──────────────────────────────────────────────────────────────────

export async function createInvoiceAction(
  clientId: string,
  projectId?: string | null,
): Promise<InvoiceActionResult> {
  await requireRole("rep");

  if (!clientId) return { ok: false, error: "clientId is required" };

  const invoice = await createInvoice({ clientId, projectId });

  revalidatePath("/invoices");
  revalidatePath(`/clients/${clientId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);

  return { ok: true, invoiceId: invoice.id };
}

// ─── line items ──────────────────────────────────────────────────────────────

export async function addLineAction(
  invoiceId: string,
  formData: FormData,
): Promise<InvoiceActionResult> {
  await requireRole("rep");

  const description = (formData.get("description") as string | null)?.trim();
  const quantityRaw = formData.get("quantity") as string | null;
  const unitPriceRaw = formData.get("unitPrice") as string | null;

  if (!description) return { ok: false, error: "Description is required" };

  const quantity = parseInt(quantityRaw ?? "1", 10);
  if (isNaN(quantity) || quantity < 1)
    return { ok: false, error: "Quantity must be a positive integer" };

  const unitPrice = parseFloat(unitPriceRaw ?? "0");
  if (isNaN(unitPrice) || unitPrice < 0)
    return { ok: false, error: "Unit price must be a non-negative number" };

  await addLine(invoiceId, {
    description,
    quantity,
    unitPrice: unitPrice.toFixed(2),
  });
  await recomputeTotals(invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function removeLineAction(
  invoiceId: string,
  lineId: string,
): Promise<InvoiceActionResult> {
  await requireRole("rep");

  await removeLine(lineId);
  await recomputeTotals(invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

// ─── tax / due date ──────────────────────────────────────────────────────────

export async function setTaxAction(
  invoiceId: string,
  formData: FormData,
): Promise<InvoiceActionResult> {
  await requireRole("rep");

  const taxRaw = (formData.get("tax") as string | null)?.trim() ?? "0";
  const tax = parseFloat(taxRaw);
  if (isNaN(tax) || tax < 0) return { ok: false, error: "Invalid tax amount" };

  await setInvoiceTax(invoiceId, tax.toFixed(2));

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function setDueDateAction(
  invoiceId: string,
  formData: FormData,
): Promise<InvoiceActionResult> {
  await requireRole("rep");

  const dueDate = (formData.get("dueDate") as string | null)?.trim() || null;

  await setInvoiceDueDate(invoiceId, dueDate);

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

// ─── status transitions ───────────────────────────────────────────────────────

async function changeStatus(
  invoiceId: string,
  status: Invoice["status"],
): Promise<InvoiceActionResult> {
  const updated = await setInvoiceStatus(invoiceId, status);
  if (!updated) return { ok: false, error: "Invoice not found." };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/clients/${updated.clientId}`);
  if (updated.projectId) revalidatePath(`/projects/${updated.projectId}`);
  return { ok: true };
}

export async function sendInvoiceAction(
  invoiceId: string,
): Promise<InvoiceActionResult> {
  await requireRole("rep");
  return changeStatus(invoiceId, "sent");
}

export async function markPaidAction(
  invoiceId: string,
): Promise<InvoiceActionResult> {
  await requireRole("rep");
  return changeStatus(invoiceId, "paid");
}

export async function markOverdueAction(
  invoiceId: string,
): Promise<InvoiceActionResult> {
  await requireRole("rep");
  return changeStatus(invoiceId, "overdue");
}

// ─── delete (owner only) ─────────────────────────────────────────────────────

export async function deleteInvoiceAction(
  invoiceId: string,
  clientId: string,
  projectId?: string | null,
): Promise<void> {
  await requireRole("owner");

  await deleteInvoice(invoiceId);

  revalidatePath("/invoices");
  revalidatePath(`/clients/${clientId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);

  redirect("/invoices");
}
