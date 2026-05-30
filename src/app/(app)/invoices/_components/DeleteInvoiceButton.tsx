"use client";

import { useState } from "react";
import { deleteInvoiceAction } from "../actions";
import { Button } from "@/components/ui/button";

type Props = {
  invoiceId: string;
  clientId: string;
  projectId?: string | null;
};

export function DeleteInvoiceButton({ invoiceId, clientId, projectId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        onClick={() => setConfirming(true)}
      >
        Delete invoice
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        Delete this invoice? This cannot be undone.
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await deleteInvoiceAction(invoiceId, clientId, projectId);
        }}
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
