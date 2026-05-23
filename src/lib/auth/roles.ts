import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { env } from "@/lib/env";

export type Role = "user" | "admin";

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
      role: ((s.user as { role?: Role }).role ?? "user") as Role,
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
  if (isOwner(session.user.email)) return "admin";
  return session.user.role;
}

export async function requireRole(role: Role): Promise<AppSession> {
  const s = await requireSession();
  const r = effectiveRole(s);
  // Admin is a superset of every role; non-admins must match exactly.
  if (r !== "admin" && r !== role) redirect("/dashboard");
  return s;
}
