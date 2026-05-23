"use client";

import { useSession } from "@/lib/auth/client";
import type { ReactNode } from "react";

type Role = "user" | "admin";

export function RequireRole({
  role,
  children,
  fallback = null,
}: {
  role: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data: session } = useSession();
  if (!session) return fallback;
  // OWNER_EMAIL bypass: the server has already set role='admin' on signup
  // for the owner; client-side we just trust session.user.role.
  const userRole = ((session.user as { role?: Role }).role ?? "user") as Role;
  if (role === "admin" && userRole !== "admin") return fallback;
  return <>{children}</>;
}
