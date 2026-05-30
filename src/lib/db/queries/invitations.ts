import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invitations, type Invitation } from "@/lib/db/schema";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Create (or refresh) a pending invitation for an email.
 *
 * If a PENDING invitation already exists for that email, it is updated in place
 * with a fresh token, the given role, a new 7-day expiry, and status reset to
 * "pending" (clearing any prior acceptedAt). Otherwise a new row is inserted.
 * Returns the row including its token.
 */
export async function createInvitation({
  email,
  role,
  invitedBy,
}: {
  email: string;
  role: string;
  invitedBy: string | null;
}): Promise<Invitation> {
  const normalized = normalizeEmail(email);
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
  const token = crypto.randomUUID();

  const existing = await getPendingInvitationByEmail(normalized);
  if (existing) {
    const [row] = await db
      .update(invitations)
      .set({
        role,
        token,
        status: "pending",
        invitedBy,
        expiresAt,
        acceptedAt: null,
      })
      .where(eq(invitations.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(invitations)
    .values({ email: normalized, role, token, invitedBy, expiresAt })
    .returning();
  return row;
}

/** Pending, non-expired invitation for an email (if any). */
export async function getPendingInvitationByEmail(
  email: string,
): Promise<Invitation | undefined> {
  const normalized = normalizeEmail(email);
  const rows = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, normalized),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0];
}

/** Look up an invitation by its token (any status). */
export async function getInvitationByToken(
  token: string,
): Promise<Invitation | undefined> {
  const rows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  return rows[0];
}

/** True if an invitation is still usable for signup (pending and not expired). */
export function isInviteUsable(inv: Invitation): boolean {
  return inv.status === "pending" && inv.expiresAt.getTime() > Date.now();
}

/**
 * Mark the pending invitation for an email as accepted.
 * Returns the invited role, or null if there was no pending invitation.
 */
export async function acceptInvitationByEmail(
  email: string,
): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const [row] = await db
    .update(invitations)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(
      and(
        eq(invitations.email, normalized),
        eq(invitations.status, "pending"),
      ),
    )
    .returning();
  return row?.role ?? null;
}

/** All pending, non-expired invitations, newest first. */
export async function listPendingInvitations(): Promise<Invitation[]> {
  return db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(invitations.createdAt));
}

/** Revoke an invitation by id. */
export async function revokeInvitation(id: string): Promise<void> {
  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(eq(invitations.id, id));
}
