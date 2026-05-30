"use client";

import { useSession } from "@/lib/auth/client";
import type { ReactNode } from "react";
import type { Role } from "@/lib/auth/roles";

const RANK: Record<Role, number> = { owner: 3, rep: 2, viewer: 1 };

const VALID_ROLES: Role[] = ["owner", "rep", "viewer"];

function clientNormalizeRole(raw: string | undefined): Role {
  // Trust whatever role the server stored in the session; just guard the type.
  if (raw && (VALID_ROLES as string[]).includes(raw)) return raw as Role;
  return "viewer";
}

export function RequireRole({
  min,
  children,
  fallback = null,
}: {
  min: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data: session } = useSession();
  if (!session) return fallback;
  // The server's databaseHook already writes "owner" for OWNER_EMAIL users, so
  // we don't need to re-check OWNER_EMAIL here — session.user.role is correct.
  const userRole = clientNormalizeRole((session.user as { role?: string }).role);
  if (RANK[userRole] < RANK[min]) return fallback;
  return <>{children}</>;
}
