"use client";

import { cn } from "@/lib/utils";
import type { Dictation, DictationEngine } from "@/lib/dictation";

/**
 * Mic toggle bound to a `useDictation` result. Renders nothing when no
 * engine is usable. Shows a fast/accurate engine selector only when the
 * Whisper engine is enabled server-side (`whisperEnabled`).
 */
export function MicButton({
  dictation,
  whisperEnabled,
}: {
  dictation: Dictation;
  whisperEnabled: boolean;
}) {
  const { recording, transcribing, webSupported, engine, setEngine, toggle } =
    dictation;

  if (!webSupported && !whisperEnabled) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={transcribing}
        aria-busy={transcribing}
        data-recording={recording ? "true" : "false"}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition",
          recording
            ? "animate-pulse border-red-500 bg-red-500 text-white"
            : "border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-100",
        )}
        title={
          transcribing
            ? "Transcribing audio…"
            : recording
              ? "Stop dictation"
              : "Start dictation"
        }
        aria-label={
          transcribing
            ? "Transcribing audio…"
            : recording
              ? "Stop dictation"
              : "Start dictation"
        }
      >
        {transcribing ? (
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
      {whisperEnabled && (
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value as DictationEngine)}
          disabled={recording || transcribing}
          aria-label="Dictation accuracy"
          title="Dictation accuracy"
          className="h-8 rounded-md border border-neutral-200 bg-transparent px-1 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
        >
          <option value="web">Fast</option>
          <option value="whisper">Accurate</option>
        </select>
      )}
    </span>
  );
}
