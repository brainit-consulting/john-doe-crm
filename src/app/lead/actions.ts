"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leads, activities, user } from "@/lib/db/schema";
import { env } from "@/lib/env";

export type PublicLeadResult =
  | { ok: true }
  | { ok: false; error: string };

const publicLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  company: z.string().trim().max(200).optional(),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(
      z.string().email("Please enter a valid email address").optional(),
    ),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function submitPublicLead(
  formData: FormData,
): Promise<PublicLeadResult> {
  // Honeypot — bot filled the hidden field; silently succeed
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return { ok: true };
  }

  const parsed = publicLeadSchema.safeParse({
    name: formData.get("name") ?? "",
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    message: formData.get("message") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name, company, email, phone, message } = parsed.data;

  // Resolve owner
  const ownerRows = await db
    .select()
    .from(user)
    .where(eq(user.email, env.OWNER_EMAIL))
    .limit(1);

  if (ownerRows.length === 0) {
    return {
      ok: false,
      error:
        "This form is not ready yet. Please contact us directly.",
    };
  }

  const ownerId = ownerRows[0]!.id;

  // Insert lead
  const [lead] = await db
    .insert(leads)
    .values({
      name,
      company: company || null,
      email: email || null,
      phone: phone || null,
      source: "web",
      status: "new",
      score: 0,
      ownerId,
    })
    .returning({ id: leads.id });

  if (!lead) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  // If a message was provided, record it as an activity note
  if (message && message.trim().length > 0) {
    await db.insert(activities).values({
      subjectType: "lead",
      subjectId: lead.id,
      kind: "note",
      body: message.trim(),
      createdBy: ownerId,
    });
  }

  return { ok: true };
}
