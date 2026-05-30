"use client";

import { useState, useTransition } from "react";
import { setUserRoleAction } from "../_actions";

// Owner is set via OWNER_EMAIL and cannot be assigned through the UI.
type AssignableRole = "rep" | "viewer";

export function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: AssignableRole;
}) {
  const [role, setRole] = useState<AssignableRole>(currentRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as AssignableRole;
    if (next === role) return;
    const previous = role;
    setRole(next);
    setError(null);
    const formData = new FormData();
    formData.set("role", next);
    startTransition(async () => {
      const result = await setUserRoleAction(userId, formData);
      if (!result.ok) {
        setError(result.error);
        setRole(previous);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <select
        value={role}
        onChange={onChange}
        disabled={pending}
        aria-label="Change user role"
        className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-sm shadow-sm transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
      >
        <option value="rep">rep</option>
        <option value="viewer">viewer</option>
      </select>
      {pending ? (
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700 dark:border-neutral-700 dark:border-t-neutral-200"
        />
      ) : null}
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
