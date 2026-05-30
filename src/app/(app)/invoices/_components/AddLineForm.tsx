"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addLineAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  invoiceId: string;
};

export function AddLineForm({ invoiceId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set("description", description);
    fd.set("quantity", quantity);
    fd.set("unitPrice", unitPrice);

    const res = await addLineAction(invoiceId, fd);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
    } else {
      setDescription("");
      setQuantity("1");
      setUnitPrice("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} variant="secondary" size="sm">
        Add line item
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <p className="text-sm font-medium">New line item</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="line-description">Description *</Label>
        <Input
          id="line-description"
          name="description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Web design: homepage"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="line-quantity">Qty</Label>
          <Input
            id="line-quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="line-unit-price">Unit price (USD)</Label>
          <Input
            id="line-unit-price"
            name="unitPrice"
            type="text"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add line"}
        </Button>
        <Button
          type="button"
          variant="ghost"
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
