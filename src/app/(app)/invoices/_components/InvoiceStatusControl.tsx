"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendInvoiceAction,
  markPaidAction,
  markOverdueAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/lib/db/schema";

type Props = {
  invoiceId: string;
  currentStatus: Invoice["status"];
};

export function InvoiceStatusControl({ invoiceId, currentStatus }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: () => Promise<{ ok: boolean; error?: string }>, label: string) {
    setPending(label);
    setError(null);
    const res = await action();
    setPending(null);
    if (!res.ok && "error" in res) {
      setError(res.error ?? "Unknown error");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus !== "sent" && currentStatus !== "paid" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending !== null}
          onClick={() => act(() => sendInvoiceAction(invoiceId), "send")}
        >
          {pending === "send" ? "…" : "Send"}
        </Button>
      )}
      {currentStatus !== "paid" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending !== null}
          onClick={() => act(() => markPaidAction(invoiceId), "paid")}
        >
          {pending === "paid" ? "…" : "Mark paid"}
        </Button>
      )}
      {currentStatus !== "overdue" && currentStatus !== "paid" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending !== null}
          onClick={() => act(() => markOverdueAction(invoiceId), "overdue")}
        >
          {pending === "overdue" ? "…" : "Mark overdue"}
        </Button>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
