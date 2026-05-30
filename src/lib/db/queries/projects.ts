import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projects, clients, type Project, type NewProject } from "@/lib/db/schema";
import { effectiveRole, type AppSession } from "@/lib/auth/roles";

/** Verify the client belongs to this user (unless owner), then return it. */
async function requireClientAccess(
  clientId: string,
  session: AppSession,
): Promise<boolean> {
  const rows = await db
    .select({ ownerId: clients.ownerId })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!rows[0]) return false;
  const role = effectiveRole(session);
  if (role === "owner") return true;
  return rows[0].ownerId === session.user.id;
}

export async function listProjectsByClient(clientId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.clientId, clientId))
    .orderBy(desc(projects.createdAt));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0];
}

export async function createProject(
  data: Omit<NewProject, "id" | "createdAt">,
  session: AppSession,
): Promise<Project | null> {
  const ok = await requireClientAccess(data.clientId, session);
  if (!ok) return null;
  const [row] = await db.insert(projects).values(data).returning();
  return row;
}

export async function updateProject(
  id: string,
  data: Partial<Omit<NewProject, "id" | "createdAt">>,
): Promise<Project | undefined> {
  const [row] = await db
    .update(projects)
    .set(data)
    .where(eq(projects.id, id))
    .returning();
  return row;
}

export async function setProjectStatus(
  id: string,
  status: Project["status"],
): Promise<Project | undefined> {
  const [row] = await db
    .update(projects)
    .set({ status })
    .where(eq(projects.id, id))
    .returning();
  return row;
}
