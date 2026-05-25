"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";
import { createNoteAction, updateNoteAction } from "../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode =
  | { mode: "create" }
  | { mode: "edit"; noteId: string; initialTitle: string; initialBody: string };

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;

export function NoteForm(props: Mode) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const [title, setTitle] = useState(isEdit ? props.initialTitle : "");
  const [body, setBody] = useState(isEdit ? props.initialBody : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const [savedTitle, setSavedTitle] = useState(isEdit ? props.initialTitle : "");
  const [savedBody, setSavedBody] = useState(isEdit ? props.initialBody : "");
  const inflight = useRef(false);

  async function submitUpdate(nextTitle: string, nextBody: string): Promise<boolean> {
    if (!isEdit) return false;
    const fd = new FormData();
    fd.set("title", nextTitle);
    fd.set("body", nextBody);
    const res = await updateNoteAction(props.noteId, fd);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setSavedTitle(nextTitle);
    setSavedBody(nextBody);
    setError(null);
    return true;
  }

  const isDirty = isEdit && (title !== savedTitle || body !== savedBody);

  // Autosave on edits — only in edit mode, only after the values diverge from
  // the last saved snapshot, and only after the user pauses for AUTOSAVE_DELAY_MS.
  useEffect(() => {
    if (!isEdit) return;
    if (pending) return;
    if (!isDirty) return;
    if (title.trim().length === 0) return;

    const timer = setTimeout(async () => {
      if (inflight.current) return;
      inflight.current = true;
      setStatus("saving");
      const ok = await submitUpdate(title, body);
      inflight.current = false;
      setStatus(ok ? "saved" : "error");
      if (ok) router.refresh();
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, isEdit, pending, isDirty]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);

    if (props.mode === "create") {
      const res = await createNoteAction(fd);
      setPending(false);
      if (res && !res.ok) {
        setError(res.error);
      }
      return;
    }

    const ok = await submitUpdate(title, body);
    setPending(false);
    if (ok) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">Body</Label>
        <textarea
          id="body"
          name="body"
          rows={10}
          className="flex w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:focus-visible:outline-white"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : props.mode === "create" ? "Create note" : "Save changes"}
        </Button>
        {isEdit ? <SaveStatusPill status={status} isDirty={isDirty} /> : null}
      </div>
    </form>
  );
}

function SaveStatusPill({ status, isDirty }: { status: SaveStatus; isDirty: boolean }) {
  if (status === "saving") {
    return <span className="text-xs text-neutral-600 dark:text-neutral-400">Saving…</span>;
  }
  if (status === "error") {
    return <span className="text-xs text-red-700 dark:text-red-400">Save failed</span>;
  }
  if (isDirty) {
    return <span className="text-xs text-neutral-600 dark:text-neutral-400">Unsaved changes</span>;
  }
  if (status === "saved") {
    return <span className="text-xs text-green-700 dark:text-green-400">Saved</span>;
  }
  return null;
}
