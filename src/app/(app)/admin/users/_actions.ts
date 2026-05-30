"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { setUserRole } from "@/lib/db/queries";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { createInvitation, revokeInvitation } from "@/lib/db/queries/invitations";
import { inviteEmail } from "@/lib/email/templates/invite";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";

// Owner is set via OWNER_EMAIL bypass and is not assignable through the UI.
const roleSchema = z.enum(["rep", "viewer"]);

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address.").transform((s) => s.trim().toLowerCase()),
  role: z.enum(["rep", "viewer"]),
});

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

export async function inviteUserAction(
  formData: FormData,
): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> {
  const session = await requireRole("owner");

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invite." };
  }
  const { email, role } = parsed.data;

  // Guard: don't invite someone who already has an account.
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "That person already has an account." };
  }

  const inv = await createInvitation({ email, role, invitedBy: session.user.id });
  const url = `${env.BETTER_AUTH_URL}/signup?invite=${inv.token}`;

  try {
    await sendEmail({
      to: email,
      ...inviteEmail({ role, url, inviterName: session.user.name }),
    });
  } catch {
    // Keep the invitation even if the email fails — surface a soft warning so
    // the owner can copy the link or retry.
    revalidatePath("/admin/users");
    return {
      ok: true,
      warning: "Invitation saved, but the email could not be sent. Check email configuration.",
    };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function revokeInvitationAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole("owner");
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Invalid invitation id" };
  }
  await revokeInvitation(id);
  revalidatePath("/admin/users");
  return { ok: true };
}
