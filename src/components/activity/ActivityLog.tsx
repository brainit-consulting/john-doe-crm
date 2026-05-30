import { listActivities } from "@/lib/db/queries/activities";
import type { Activity } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { LogActivityForm } from "./LogActivityForm";

const KIND_LABELS: Record<Activity["kind"], string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  stage_change: "Stage change",
};

const KIND_COLORS: Record<Activity["kind"], string> = {
  call: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  email: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  meeting: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  note: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  stage_change: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

function formatWhen(date: Date): { relative: string; absolute: string } {
  const absolute = date.toLocaleString();
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  let relative: string;
  if (minutes < 1) relative = "just now";
  else if (minutes < 60) relative = `${minutes}m ago`;
  else if (minutes < 60 * 24) relative = `${Math.floor(minutes / 60)}h ago`;
  else relative = `${Math.floor(minutes / (60 * 24))}d ago`;
  return { relative, absolute };
}

export async function ActivityLog({
  subjectType,
  subjectId,
}: {
  subjectType: Activity["subjectType"];
  subjectId: string;
}) {
  const entries = await listActivities(subjectType, subjectId);
  const whisperEnabled = Boolean(env.OPENAI_API_KEY);

  return (
    <div className="space-y-5">
      <LogActivityForm
        subjectType={subjectType}
        subjectId={subjectId}
        whisperEnabled={whisperEnabled}
      />

      {entries.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No activity logged yet.
        </p>
      ) : (
        <ol className="space-y-4">
          {entries.map((entry) => {
            const { relative, absolute } = formatWhen(entry.createdAt);
            return (
              <li
                key={entry.id}
                className="flex flex-col gap-1.5 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${KIND_COLORS[entry.kind]}`}
                  >
                    {KIND_LABELS[entry.kind]}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {entry.authorName ?? "Unknown"}
                  </span>
                  <span
                    title={absolute}
                    className="text-xs text-neutral-400 dark:text-neutral-500"
                  >
                    {relative} · {absolute}
                  </span>
                </div>

                {entry.body && (
                  <p className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">
                    {entry.body}
                  </p>
                )}

                {/* Voice-note transcripts (populated by T6 dictation). */}
                {entry.transcripts.map((transcript, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-brand/40 pl-3 text-sm italic text-neutral-600 dark:text-neutral-400"
                  >
                    {transcript}
                  </blockquote>
                ))}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
