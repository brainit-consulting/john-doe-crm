"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { logActivity } from "@/app/(app)/activities/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDictation } from "@/lib/dictation";
import { MicButton } from "@/components/mic-button";
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
  /** True when OPENAI_API_KEY is set server-side; enables the Whisper engine option. */
  whisperEnabled: boolean;
};

export function LogActivityForm({ subjectType, subjectId, whisperEnabled }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<Activity["kind"]>("note");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Track the raw dictated text separately so we can persist a voice_notes row
  // alongside the activity when the form is submitted.
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const dictation = useDictation({
    whisperEnabled,
    onTranscript: (text) => {
      // Append the transcript to the body (space-separated when body is non-empty).
      setBody((prev) => (prev ? prev + " " : "") + text);
      // Accumulate the raw dictated text so the voice_notes row captures the
      // full dictated content, even if the user edits the body before saving.
      setVoiceTranscript((prev) => (prev ? prev + " " : "") + text);
    },
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    // Stop any active dictation before submitting.
    dictation.stop();

    const fd = new FormData();
    fd.set("subjectType", subjectType);
    fd.set("subjectId", subjectId);
    fd.set("kind", kind);
    fd.set("body", body);
    // Only include voiceTranscript when dictation was actually used.
    if (voiceTranscript.trim()) {
      fd.set("voiceTranscript", voiceTranscript.trim());
    }

    const res = await logActivity(fd);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setBody("");
    setKind("note");
    setVoiceTranscript("");
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

      {/* Body + toolbar. Mic button sits in the toolbar row (T6 seam). */}
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
        <div className="flex items-center gap-2" data-activity-toolbar>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Logging…" : "Log activity"}
          </Button>
          {/* T6 SEAM: mic button — transcribed text is appended to the body
              textarea; the user can edit before submitting. Do NOT auto-submit. */}
          <MicButton dictation={dictation} whisperEnabled={whisperEnabled} />
        </div>
        {dictation.error && (
          <p className="text-xs text-red-600 dark:text-red-400">{dictation.error}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
