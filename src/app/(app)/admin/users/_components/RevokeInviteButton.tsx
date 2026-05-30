"use client";

import { useState, useTransition } from "react";
import { revokeInvitationAction } from "../_actions";

export function RevokeInviteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitationAction(id);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </span>
  );
}
