"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateClientAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@/lib/db/schema";

type Props = {
  clientId: string;
  initial: Pick<Client, "name" | "company" | "billingEmail" | "address">;
};

export function ClientForm({ clientId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [company, setCompany] = useState(initial.company ?? "");
  const [billingEmail, setBillingEmail] = useState(initial.billingEmail ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("company", company);
    fd.set("billingEmail", billingEmail);
    fd.set("address", address);

    const res = await updateClientAction(clientId, fd);
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
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="billingEmail">Billing email</Label>
        <Input
          id="billingEmail"
          name="billingEmail"
          type="email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
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
