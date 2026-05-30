"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setDueDateAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  invoiceId: string;
  currentDueDate: string | null | undefined;
};

export function SetDueDateForm({ invoiceId, currentDueDate }: Props) {
  const router = useRouter();
  const [dueDate, setDueDate] = useState(currentDueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set("dueDate", dueDate);

    const res = await setDueDateAction(invoiceId, fd);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="invoice-due-date" className="text-xs">
          Due date
        </Label>
        <Input
          id="invoice-due-date"
          name="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <Button type="submit" disabled={pending} size="sm" variant="secondary">
        {pending ? "…" : "Set"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
