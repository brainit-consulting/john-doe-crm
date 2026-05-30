"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { setUserRole } from "@/lib/db/queries";

// Owner is set via OWNER_EMAIL bypass and is not assignable through the UI.
const roleSchema = z.enum(["rep", "viewer"]);

export async function setUserRoleAction(
  userId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole("owner");

  if (typeof userId !== "string" || userId.length === 0) {
    return { ok: false, error: "Invalid userId" };
  }

  const raw = formData.get("role");
  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid role" };
  }

  await setUserRole(userId, parsed.data);
  revalidatePath("/admin/users");
  return { ok: true };
}
