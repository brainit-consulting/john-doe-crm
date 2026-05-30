"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createProjectAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  clientId: string;
};

export function AddProjectForm({ clientId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"proposed" | "active" | "on_hold" | "delivered">("proposed");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fee, setFee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("status", status);
    fd.set("startDate", startDate);
    fd.set("dueDate", dueDate);
    fd.set("fee", fee);

    const res = await createProjectAction(clientId, fd);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
    } else {
      setTitle("");
      setDescription("");
      setStatus("proposed");
      setStartDate("");
      setDueDate("");
      setFee("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} variant="secondary" size="sm">
        Add project
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-sm font-medium">New project</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proj-title">Title *</Label>
        <Input
          id="proj-title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proj-description">Description</Label>
        <textarea
          id="proj-description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:focus:ring-neutral-700"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proj-status">Status</Label>
        <select
          id="proj-status"
          name="status"
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:ring-neutral-700"
        >
          <option value="proposed">Proposed</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proj-startDate">Start date</Label>
          <Input
            id="proj-startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proj-dueDate">Due date</Label>
          <Input
            id="proj-dueDate"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proj-fee">Fee</Label>
        <Input
          id="proj-fee"
          name="fee"
          type="text"
          inputMode="decimal"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="e.g. 5000.00"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
