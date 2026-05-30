"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "../actions";
import { Button } from "@/components/ui/button";

type Props = {
  clientId: string;
  projectId?: string | null;
};

export function NewInvoiceButton({ clientId, projectId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const res = await createInvoiceAction(clientId, projectId);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
    } else if (res.invoiceId) {
      router.push(`/invoices/${res.invoiceId}`);
    }
  }

  return (
    <div>
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={handleClick}>
        {pending ? "Creating…" : "New invoice"}
      </Button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
