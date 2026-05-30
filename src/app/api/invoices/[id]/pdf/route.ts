import { requireSession } from "@/lib/auth/roles";
import { getInvoice } from "@/lib/db/queries/invoices";
import { jsPDF } from "jspdf";

export const runtime = "nodejs";

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
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const pageW = 612; // letter width in pt
  const marginL = 50;
  const marginR = 50;
  const contentW = pageW - marginL - marginR;
  let y = 50;

  // ── Header ──────────────────────────────────────────────────────────────────

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("John Doe CRM", marginL, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Invoice", pageW - marginR, y, { align: "right" });
  y += 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(invoice.invoiceNumber, pageW - marginR, y, { align: "right" });
  y += 30;

  // ── Divider ──────────────────────────────────────────────────────────────────

  doc.setDrawColor(200);
  doc.line(marginL, y, pageW - marginR, y);
  y += 20;

  // ── Bill-to ──────────────────────────────────────────────────────────────────

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("BILL TO", marginL, y);
  y += 14;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(invoice.clientName ?? "Unknown", marginL, y);
  y += 15;

  if (invoice.projectTitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`Project: ${invoice.projectTitle}`, marginL, y);
    y += 14;
  }

  // ── Dates (right-aligned, same vertical band as bill-to) ─────────────────────

  const datesStartY = y - (invoice.projectTitle ? 43 : 29);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("ISSUE DATE", pageW - marginR, datesStartY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(formatDate(invoice.issueDate), pageW - marginR, datesStartY + 13, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("DUE DATE", pageW - marginR, datesStartY + 30, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(formatDate(invoice.dueDate), pageW - marginR, datesStartY + 43, { align: "right" });

  y += 20;

  // ── Status badge ──────────────────────────────────────────────────────────────

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text(`STATUS: ${invoice.status.toUpperCase()}`, marginL, y);
  y += 25;

  // ── Divider ──────────────────────────────────────────────────────────────────

  doc.setDrawColor(200);
  doc.line(marginL, y, pageW - marginR, y);
  y += 15;

  // ── Line items table header ────────────────────────────────────────────────────

  const colDesc = marginL;
  const colQty = marginL + contentW * 0.52;
  const colUnit = marginL + contentW * 0.65;
  const colTotal = pageW - marginR;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("DESCRIPTION", colDesc, y);
  doc.text("QTY", colQty, y);
  doc.text("UNIT PRICE", colUnit, y);
  doc.text("LINE TOTAL", colTotal, y, { align: "right" });
  y += 5;

  doc.setDrawColor(220);
  doc.line(marginL, y, pageW - marginR, y);
  y += 12;

  // ── Line items ────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);

  if (invoice.lines.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("No line items.", marginL, y);
    y += 18;
  } else {
    for (const line of invoice.lines) {
      doc.setFontSize(10);
      doc.setTextColor(0);

      // Wrap long descriptions
      const descLines = doc.splitTextToSize(line.description, contentW * 0.48) as string[];
      doc.text(descLines, colDesc, y);

      const lineH = Math.max(descLines.length * 13, 13);

      doc.text(String(line.quantity), colQty, y);
      doc.text(formatCurrency(line.unitPrice), colUnit, y);
      const lineTotal = parseFloat(line.unitPrice) * line.quantity;
      doc.text(
        formatCurrency(isNaN(lineTotal) ? "0" : String(lineTotal)),
        colTotal,
        y,
        { align: "right" },
      );

      y += lineH + 4;

      doc.setDrawColor(235);
      doc.line(marginL, y - 2, pageW - marginR, y - 2);
    }
  }

  y += 10;

  // ── Totals ────────────────────────────────────────────────────────────────────

  const totalsLabelX = colUnit - 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Subtotal", totalsLabelX, y, { align: "right" });
  doc.setTextColor(0);
  doc.text(formatCurrency(invoice.subtotal), colTotal, y, { align: "right" });
  y += 16;

  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text("Tax", totalsLabelX, y, { align: "right" });
  doc.setTextColor(0);
  doc.text(formatCurrency(invoice.tax), colTotal, y, { align: "right" });
  y += 4;

  doc.setDrawColor(180);
  doc.line(colUnit - 80, y, pageW - marginR, y);
  y += 12;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Total", totalsLabelX, y, { align: "right" });
  doc.text(formatCurrency(invoice.total), colTotal, y, { align: "right" });

  // ── Footer ────────────────────────────────────────────────────────────────────

  const pageH = 792; // letter height in pt
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160);
  doc.text("Generated by John Doe CRM", pageW / 2, pageH - 30, { align: "center" });

  // ── Output ────────────────────────────────────────────────────────────────────

  const buffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
