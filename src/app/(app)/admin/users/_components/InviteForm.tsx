"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inviteUserAction } from "../_actions";

// Owner is set via OWNER_EMAIL and cannot be assigned through the UI.
type AssignableRole = "rep" | "viewer";

type Feedback =
  | { kind: "success"; message: string }
  | { kind: "warning"; message: string }
  | { kind: "error"; message: string }
  | null;

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("viewer");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData();
    formData.set("email", email);
    formData.set("role", role);
    startTransition(async () => {
      const result = await inviteUserAction(formData);
      if (!result.ok) {
        setFeedback({ kind: "error", message: result.error });
        return;
      }
      if (result.warning) {
        setFeedback({ kind: "warning", message: result.warning });
      } else {
        setFeedback({ kind: "success", message: `Invite sent to ${email}.` });
      }
      setEmail("");
      setRole("viewer");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <label htmlFor="invite-email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          placeholder="teammate@example.com"
          className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm shadow-sm transition-colors hover:border-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:focus-visible:outline-white"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="invite-role" className="block text-sm font-medium">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as AssignableRole)}
          disabled={pending}
          className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm shadow-sm transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
        >
          <option value="rep">rep</option>
          <option value="viewer">viewer</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
      {feedback ? (
        <span
          role="status"
          className={
            feedback.kind === "error"
              ? "text-xs text-red-600 dark:text-red-400 sm:self-center"
              : feedback.kind === "warning"
                ? "text-xs text-amber-600 dark:text-amber-400 sm:self-center"
                : "text-xs text-emerald-600 dark:text-emerald-400 sm:self-center"
          }
        >
          {feedback.message}
        </span>
      ) : null}
    </form>
  );
}
