import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { env } from "@/lib/env";

export type Role = "owner" | "rep" | "viewer";

const RANK: Record<Role, number> = { owner: 3, rep: 2, viewer: 1 };

const VALID_ROLES: Role[] = ["owner", "rep", "viewer"];

function normalizeRole(raw: string | undefined): Role {
  if (raw && (VALID_ROLES as string[]).includes(raw)) return raw as Role;
  return "viewer";
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AppSession = {
  user: SessionUser;
};

export async function getSession(): Promise<AppSession | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  return {
    user: {
      id: s.user.id,
      email: s.user.email,
      name: s.user.name,
      role: normalizeRole((s.user as { role?: string }).role),
    },
  };
}

export async function requireSession(): Promise<AppSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export function isOwner(email: string): boolean {
  return email === env.OWNER_EMAIL;
}

export function effectiveRole(session: AppSession): Role {
  if (isOwner(session.user.email)) return "owner";
  return session.user.role;
}

export function hasRole(session: AppSession, min: Role): boolean {
  return RANK[effectiveRole(session)] >= RANK[min];
}

export async function requireRole(min: Role): Promise<AppSession> {
  const s = await requireSession();
  if (!hasRole(s, min)) redirect("/dashboard");
  return s;
}
