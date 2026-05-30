import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clients, type Client, type NewClient } from "@/lib/db/schema";
import { effectiveRole, type AppSession } from "@/lib/auth/roles";

export type ListClientsOpts = {
  session: AppSession;
};

export async function listClients({ session }: ListClientsOpts): Promise<Client[]> {
  const role = effectiveRole(session);
  if (role === "owner") {
    // owner sees all clients
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }
  // rep and viewer see only their own clients
  return db
    .select()
    .from(clients)
    .where(eq(clients.ownerId, session.user.id))
    .orderBy(desc(clients.createdAt));
}

export async function getClient(id: string): Promise<Client | undefined> {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0];
}

export async function createClient(
  data: Omit<NewClient, "id" | "createdAt">,
): Promise<Client> {
  const [row] = await db.insert(clients).values(data).returning();
  return row;
}

export async function updateClient(
  id: string,
  data: Partial<Omit<NewClient, "id" | "createdAt">>,
): Promise<Client | undefined> {
  const [row] = await db
    .update(clients)
    .set(data)
    .where(eq(clients.id, id))
    .returning();
  return row;
}
