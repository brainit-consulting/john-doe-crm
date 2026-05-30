"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { logActivity } from "@/app/(app)/activities/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Activity } from "@/lib/db/schema";

// Kinds a rep can log by hand. `stage_change` is system-only and intentionally
// excluded from the picker.
const KIND_OPTIONS: { value: Activity["kind"]; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
];

type Props = {
  subjectType: Activity["subjectType"];
  subjectId: string;
};

export function LogActivityForm({ subjectType, subjectId }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<Activity["kind"]>("note");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set("subjectType", subjectType);
    fd.set("subjectId", subjectId);
    fd.set("kind", kind);
    fd.set("body", body);

    const res = await logActivity(fd);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setBody("");
    setKind("note");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="activity-kind">Kind</Label>
        <select
          id="activity-kind"
          name="kind"
          aria-label="Activity kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as Activity["kind"])}
          className="w-full max-w-[12rem] rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:ring-neutral-700"
        >
          {KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Body + toolbar are kept as distinct rows so a mic/dictation button can
          drop into the toolbar in T6 without restructuring this form. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="activity-body">What happened?</Label>
        <textarea
          id="activity-body"
          name="body"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Log a call, email, meeting, or note…"
          className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:focus:ring-neutral-700"
        />
        {/* T6 SEAM: dictation mic button goes here, next to Submit. Render a
            <MicButton onTranscript={(t) => setBody((b) => b + t)} /> in this
            toolbar row — no dictation logic in T5. */}
        <div className="flex items-center gap-2" data-activity-toolbar>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Logging…" : "Log activity"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
