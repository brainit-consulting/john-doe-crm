"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setTaxAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  invoiceId: string;
  currentTax: string;
};

export function SetTaxForm({ invoiceId, currentTax }: Props) {
  const router = useRouter();
  const [tax, setTax] = useState(currentTax === "0" ? "" : currentTax);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set("tax", tax || "0");

    const res = await setTaxAction(invoiceId, fd);
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
        <Label htmlFor="invoice-tax" className="text-xs">
          Tax (USD)
        </Label>
        <Input
          id="invoice-tax"
          name="tax"
          type="text"
          inputMode="decimal"
          value={tax}
          onChange={(e) => setTax(e.target.value)}
          placeholder="0.00"
          className="h-8 w-32 text-sm"
        />
      </div>
      <Button type="submit" disabled={pending} size="sm" variant="secondary">
        {pending ? "…" : "Set"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
