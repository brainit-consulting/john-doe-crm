"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProjectAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/db/schema";

type Props = {
  projectId: string;
  clientId: string;
  initial: Pick<Project, "title" | "description" | "startDate" | "dueDate" | "fee">;
};

export function ProjectEditForm({ projectId, clientId, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [startDate, setStartDate] = useState(initial.startDate ?? "");
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const [fee, setFee] = useState(initial.fee ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("startDate", startDate);
    fd.set("dueDate", dueDate);
    fd.set("fee", fee);

    const res = await updateProjectAction(projectId, clientId, fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-title">Title *</Label>
        <Input
          id="edit-title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-description">Description</Label>
        <textarea
          id="edit-description"
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:focus:ring-neutral-700"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-startDate">Start date</Label>
          <Input
            id="edit-startDate"
            name="startDate"
            type="date"
            value={startDate ?? ""}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-dueDate">Due date</Label>
          <Input
            id="edit-dueDate"
            name="dueDate"
            type="date"
            value={dueDate ?? ""}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-fee">Fee</Label>
        <Input
          id="edit-fee"
          name="fee"
          type="text"
          inputMode="decimal"
          value={fee ?? ""}
          onChange={(e) => setFee(e.target.value)}
          placeholder="e.g. 5000.00"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
