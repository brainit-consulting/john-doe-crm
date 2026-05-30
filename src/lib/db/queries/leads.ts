import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leads, type Lead, type NewLead } from "@/lib/db/schema";
import { effectiveRole, type AppSession } from "@/lib/auth/roles";

const COLD_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

export function isGoingCold(lead: Pick<Lead, "lastActivityAt">): boolean {
  return Date.now() - lead.lastActivityAt.getTime() > COLD_THRESHOLD_MS;
}

export type ListLeadsOpts = {
  session: AppSession;
};

export async function listLeads({ session }: ListLeadsOpts): Promise<Lead[]> {
  const role = effectiveRole(session);
  if (role === "owner") {
    // owner sees all leads
    return db.select().from(leads).orderBy(desc(leads.lastActivityAt));
  }
  // rep and viewer see only their own leads
  return db
    .select()
    .from(leads)
    .where(eq(leads.ownerId, session.user.id))
    .orderBy(desc(leads.lastActivityAt));
}

export async function getLead(id: string): Promise<Lead | undefined> {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0];
}

export async function createLead(
  data: Omit<NewLead, "id" | "createdAt" | "lastActivityAt">,
): Promise<Lead> {
  const [row] = await db
    .insert(leads)
    .values({ ...data, lastActivityAt: new Date() })
    .returning();
  return row;
}

export async function updateLead(
  id: string,
  data: Partial<Omit<NewLead, "id" | "createdAt">>,
): Promise<Lead | undefined> {
  const [row] = await db
    .update(leads)
    .set({ ...data, lastActivityAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  return row;
}

export async function setLeadStatus(
  id: string,
  status: Lead["status"],
): Promise<Lead | undefined> {
  const [row] = await db
    .update(leads)
    .set({ status, lastActivityAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  return row;
}

export async function setLeadScore(
  id: string,
  score: number,
): Promise<Lead | undefined> {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const [row] = await db
    .update(leads)
    .set({ score: clamped, lastActivityAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  return row;
}
