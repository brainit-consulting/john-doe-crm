"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Pure helper ─────────────────────────────────────────────────────
/**
 * Splice `insert` into `value`, replacing the [start, end) selection.
 * Returns the new string and the caret position to place immediately
 * after the inserted text. Adds a single separating space only when
 * gluing the insert directly onto a non-whitespace prefix.
 */
export function insertAtCursor(
  value: string,
  start: number,
  end: number,
  insert: string,
): { value: string; caret: number } {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
  const piece = (needsLeadingSpace ? " " : "") + insert;
  return { value: before + piece + after, caret: before.length + piece.length };
}

// ── Web Speech API plumbing ─────────────────────────────────────────
// Web Speech API isn't in TS's lib.dom — minimal shape we use.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Map a MediaRecorder mimeType to a filename extension OpenAI recognizes.
function extForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

// Friendly text for a Web Speech `onerror` code.
function messageForSpeechError(code?: string): string {
  switch (code) {
    case "no-speech":
      return "Didn't catch anything — click the mic and start speaking.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Click the mic (or lock) icon in your browser's address bar, allow it for this site, then try again.";
    case "audio-capture":
      return "No microphone found — check one is connected and not in use by another app.";
    case "network":
      return "The speech service is unreachable. Check your connection, or switch to the Accurate engine.";
    default:
      return "Dictation stopped unexpectedly. Try again.";
  }
}

// Friendly text for a getUserMedia rejection (Whisper path + Web Speech probe).
function messageForMicError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone found — check one is connected.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your microphone is in use by another app. Close it and try again.";
  }
  return "Microphone access is blocked. Click the mic (or lock) icon in your browser's address bar, allow it for this site, then try again.";
}

// ── Hook ────────────────────────────────────────────────────────────
export type DictationEngine = "web" | "whisper";

// Persist the user's Fast/Accurate choice so it survives reloads.
const ENGINE_STORAGE_KEY = "john-doe-crm:dictation-engine";

function readStoredEngine(): DictationEngine | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(ENGINE_STORAGE_KEY);
    return v === "web" || v === "whisper" ? v : null;
  } catch {
    return null;
  }
}

function writeStoredEngine(e: DictationEngine): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENGINE_STORAGE_KEY, e);
  } catch {
    // ignore (private mode / quota / disabled storage)
  }
}

export type Dictation = {
  recording: boolean;
  transcribing: boolean;
  webSupported: boolean;
  engine: DictationEngine;
  setEngine: (e: DictationEngine) => void;
  error: string | null;
  toggle: () => void;
  stop: () => void;
};

export function useDictation({
  onTranscript,
  whisperEnabled,
}: {
  onTranscript: (text: string) => void;
  whisperEnabled: boolean;
}): Dictation {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [webSupported, setWebSupported] = useState(false);
  const [engine, setEngine] = useState<DictationEngine>("web");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startingRef = useRef(false);
  // Web Speech: true while the user wants to keep dictating. Chrome ends a
  // session after a short silence even with continuous=true, so we restart
  // until the user stops (or a fatal error clears the intent).
  const intentRef = useRef(false);
  const lastStartRef = useRef(0);
  // Holds the latest session-starter so `onend` can restart without the
  // callback referencing itself (which the react-hooks rules disallow).
  const beginWebRef = useRef<() => void>(() => {});

  // Keep the latest callback reachable from engine handlers without
  // re-subscribing them. Updated every render so closures read fresh state.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  // Read whisperEnabled freshly inside the memoized Web Speech error handler.
  const whisperEnabledRef = useRef(whisperEnabled);
  useEffect(() => {
    whisperEnabledRef.current = whisperEnabled;
  });
  // Assigned by a later effect (after startWhisper/selectEngine exist): switches
  // to the Accurate engine and resumes recording when Web Speech is unreachable.
  const fallbackToWhisperRef = useRef<() => void>(() => {});

  useEffect(() => {
    const supported = getSpeechRecognitionCtor() !== null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs window, only available post-mount
    setWebSupported(supported);
    // Restore the saved engine preference. Only honor a stored "whisper" when
    // Whisper is actually configured; otherwise fall back to Whisper when Web
    // Speech is unavailable, else the "web" default (already set).
    const stored = readStoredEngine();
    const next: DictationEngine =
      stored === "whisper" && whisperEnabled
        ? "whisper"
        : stored === "web"
          ? "web"
          : !supported && whisperEnabled
            ? "whisper"
            : "web";
    if (next === "whisper") {
      setEngine("whisper");
    }
    return () => {
      // Detach handlers BEFORE stopping so the async stop()/onstop/onend
      // callbacks can't fire setState or fetch on the unmounted component.
      intentRef.current = false;
      const rec = recognitionRef.current;
      if (rec) {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.stop();
      }
      const mr = mediaRef.current;
      if (mr) {
        mr.ondataavailable = null;
        mr.onstop = null;
        if (mr.state !== "inactive") mr.stop();
        mr.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [whisperEnabled]);

  // Create + start one Web Speech session.
  const beginWebSession = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (text) onTranscriptRef.current(text);
        }
      }
    };
    rec.onerror = (e) => {
      const code = e?.error;
      if (code && code !== "no-speech" && code !== "aborted") {
        intentRef.current = false;
        // Auto-fallback: browser speech service unreachable + Whisper available →
        // switch to Accurate and keep recording instead of erroring out.
        if (code === "network" && whisperEnabledRef.current) {
          recognitionRef.current = null;
          fallbackToWhisperRef.current();
          return;
        }
        setError(messageForSpeechError(code));
      }
    };
    rec.onend = () => {
      recognitionRef.current = null;
      if (!intentRef.current) {
        setRecording(false);
        return;
      }
      if (Date.now() - lastStartRef.current < 400) {
        intentRef.current = false;
        setRecording(false);
        return;
      }
      try {
        beginWebRef.current();
      } catch {
        intentRef.current = false;
        setRecording(false);
      }
    };
    recognitionRef.current = rec;
    lastStartRef.current = Date.now();
    rec.start();
  }, []);
  useEffect(() => {
    beginWebRef.current = beginWebSession;
  });

  const startWeb = useCallback(async () => {
    if (recognitionRef.current) return;
    if (!getSpeechRecognitionCtor()) {
      setError("Speech recognition isn't supported in this browser.");
      return;
    }
    // Ask for the mic up front so Chrome shows its standard (persistent) prompt
    // and recognition doesn't race/abort against the permission dialog.
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
        probe.getTracks().forEach((t) => t.stop());
      } catch (err) {
        setError(messageForMicError(err));
        return;
      }
    }
    setError(null);
    intentRef.current = true;
    try {
      beginWebSession();
      setRecording(true);
    } catch {
      intentRef.current = false;
      setError("Couldn't start dictation. Try again.");
    }
  }, [beginWebSession]);

  const startWhisper = useCallback(async () => {
    if (mediaRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Microphone capture isn't available in this browser.");
      return;
    }
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(messageForMicError(err));
      return;
    }
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      mediaRef.current = null;
      setRecording(false);
      const mime = mr.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      if (blob.size === 0) return;
      setTranscribing(true);
      try {
        const fd = new FormData();
        fd.set("audio", blob, `audio.${extForMime(mime)}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        if (!res.ok) {
          setError("Transcription failed.");
          return;
        }
        const data = (await res.json()) as { text?: string };
        const text = (data.text ?? "").trim();
        if (text) onTranscriptRef.current(text);
      } catch {
        setError("Transcription failed.");
      } finally {
        setTranscribing(false);
      }
    };
    mediaRef.current = mr;
    mr.start();
    setRecording(true);
  }, []);

  const toggle = useCallback(() => {
    if (recording) {
      intentRef.current = false;
      recognitionRef.current?.stop();
      mediaRef.current?.stop();
      return;
    }
    if (startingRef.current) return;
    startingRef.current = true;
    const starter =
      engine === "whisper" && whisperEnabled ? startWhisper : startWeb;
    void starter().finally(() => {
      startingRef.current = false;
    });
  }, [recording, engine, whisperEnabled, startWhisper, startWeb]);

  const stop = useCallback(() => {
    intentRef.current = false;
    recognitionRef.current?.stop();
    mediaRef.current?.stop();
  }, []);

  const selectEngine = useCallback((e: DictationEngine) => {
    setEngine(e);
    writeStoredEngine(e);
  }, []);

  // Wire the Web-Speech→Whisper auto-fallback now that startWhisper + selectEngine exist.
  useEffect(() => {
    fallbackToWhisperRef.current = () => {
      selectEngine("whisper");
      void startWhisper();
    };
  }, [selectEngine, startWhisper]);

  return {
    recording,
    transcribing,
    webSupported,
    engine,
    setEngine: selectEngine,
    error,
    toggle,
    stop,
  };
}
