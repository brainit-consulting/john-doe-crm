"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { updateClient } from "@/lib/db/queries/clients";

export type ClientActionResult =
  | { ok: true }
  | { ok: false; error: string };

const clientUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  company: z.string().trim().max(200).optional(),
  billingEmail: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500).optional(),
});

export async function updateClientAction(
  clientId: string,
  formData: FormData,
): Promise<ClientActionResult> {
  await requireRole("rep");

  const parsed = clientUpdateSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") ?? "",
    billingEmail: formData.get("billingEmail") ?? "",
    address: formData.get("address") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, company, billingEmail, address } = parsed.data;

  const updated = await updateClient(clientId, {
    name,
    company: company || null,
    billingEmail: billingEmail && billingEmail !== "" ? billingEmail : null,
    address: address || null,
  });

  if (!updated) {
    return { ok: false, error: "Client not found." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}
