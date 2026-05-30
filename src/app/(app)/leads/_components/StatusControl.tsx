"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLeadStatusAction } from "../actions";
import type { Lead } from "@/lib/db/schema";

const STATUS_FLOW: Lead["status"][] = ["new", "contacted", "qualified", "won", "lost"];

const STATUS_LABELS: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

const STATUS_COLORS: Record<Lead["status"], string> = {
  new: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  won: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function StatusControl({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: Lead["status"];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Lead["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function advance(status: Lead["status"]) {
    setPending(status);
    setError(null);
    const res = await setLeadStatusAction(leadId, status);
    setPending(null);
    if (!res.ok) {
      setError(res.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_FLOW.map((s) => {
          const isCurrent = s === currentStatus;
          return (
            <button
              type="button"
              key={s}
              disabled={isCurrent || pending !== null}
              onClick={() => advance(s)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-opacity ${STATUS_COLORS[s]} ${isCurrent ? "ring-2 ring-offset-2 ring-neutral-400 dark:ring-neutral-600" : "opacity-60 hover:opacity-100"} disabled:cursor-default`}
            >
              {pending === s ? "…" : STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
