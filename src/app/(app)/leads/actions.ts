"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, effectiveRole } from "@/lib/auth/roles";
import {
  createLead,
  getLead,
  updateLead,
  setLeadStatus,
  setLeadScore,
} from "@/lib/db/queries/leads";
import { createClient } from "@/lib/db/queries/clients";
import { db } from "@/lib/db/client";
import { activities } from "@/lib/db/schema";
import type { Lead } from "@/lib/db/schema";

export type LeadActionResult =
  | { ok: true }
  | { ok: false; error: string };

const leadInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  company: z.string().trim().max(200).optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  source: z.enum(["referral", "web", "event", "cold"]).default("web"),
  estValue: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
});

export async function createLeadAction(formData: FormData): Promise<LeadActionResult> {
  const session = await requireRole("rep");

  const parsed = leadInputSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    source: formData.get("source") ?? "web",
    estValue: formData.get("estValue") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, company, email, phone, source, estValue } = parsed.data;

  const lead = await createLead({
    name,
    company: company || null,
    email: (email && email !== "") ? email : null,
    phone: phone || null,
    source,
    estValue: estValue ?? null,
    score: 0,
    status: "new",
    ownerId: session.user.id,
  });

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadAction(
  leadId: string,
  formData: FormData,
): Promise<LeadActionResult> {
  await requireRole("rep");

  const parsed = leadInputSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    source: formData.get("source") ?? "web",
    estValue: formData.get("estValue") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, company, email, phone, source, estValue } = parsed.data;

  const updated = await updateLead(leadId, {
    name,
    company: company || null,
    email: (email && email !== "") ? email : null,
    phone: phone || null,
    source,
    estValue: estValue ?? null,
  });

  if (!updated) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function setLeadStatusAction(
  leadId: string,
  status: Lead["status"],
): Promise<LeadActionResult> {
  await requireRole("rep");

  const validStatuses: Lead["status"][] = ["new", "contacted", "qualified", "won", "lost"];
  if (!validStatuses.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const updated = await setLeadStatus(leadId, status);
  if (!updated) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function setLeadScoreAction(
  leadId: string,
  score: number,
): Promise<LeadActionResult> {
  await requireRole("rep");

  if (typeof score !== "number" || isNaN(score)) {
    return { ok: false, error: "Invalid score" };
  }

  const updated = await setLeadScore(leadId, score);
  if (!updated) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function convertToClientAction(
  leadId: string,
): Promise<LeadActionResult> {
  const session = await requireRole("rep");
  const role = effectiveRole(session);

  const lead = await getLead(leadId);
  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  // Non-owners can only convert their own leads
  if (role !== "owner" && lead.ownerId !== session.user.id) {
    return { ok: false, error: "Not authorized." };
  }

  // Create the client record (leadId links back to origin lead)
  const client = await createClient({
    leadId: lead.id,
    name: lead.name,
    company: lead.company ?? null,
    billingEmail: lead.email ?? null,
    address: null,
    ownerId: session.user.id,
  });

  // Mark the lead as won
  await setLeadStatus(lead.id, "won");

  // Record a stage_change activity on the new client
  await db.insert(activities).values({
    subjectType: "client",
    subjectId: client.id,
    kind: "stage_change",
    body: "Converted from lead",
    createdBy: session.user.id,
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients");

  redirect(`/clients/${client.id}`);
}
