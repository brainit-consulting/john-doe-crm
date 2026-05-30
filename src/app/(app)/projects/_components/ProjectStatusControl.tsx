"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setProjectStatusAction } from "../actions";
import type { Project } from "@/lib/db/schema";

const STATUS_FLOW: Project["status"][] = ["proposed", "active", "on_hold", "delivered"];

const STATUS_LABELS: Record<Project["status"], string> = {
  proposed: "Proposed",
  active: "Active",
  on_hold: "On hold",
  delivered: "Delivered",
};

const STATUS_COLORS: Record<Project["status"], string> = {
  proposed: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export function ProjectStatusControl({
  projectId,
  clientId,
  currentStatus,
}: {
  projectId: string;
  clientId: string;
  currentStatus: Project["status"];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Project["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function advance(status: Project["status"]) {
    setPending(status);
    setError(null);
    const res = await setProjectStatusAction(projectId, clientId, status);
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
