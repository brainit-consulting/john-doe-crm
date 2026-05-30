"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createLeadAction, updateLeadAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Lead } from "@/lib/db/schema";

type Mode =
  | { mode: "create" }
  | {
      mode: "edit";
      leadId: string;
      initial: Pick<Lead, "name" | "company" | "email" | "phone" | "source" | "estValue">;
    };

const SOURCE_OPTIONS: { value: Lead["source"]; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "referral", label: "Referral" },
  { value: "event", label: "Event" },
  { value: "cold", label: "Cold outreach" },
];

export function LeadForm(props: Mode) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [name, setName] = useState(isEdit ? props.initial.name : "");
  const [company, setCompany] = useState(isEdit ? (props.initial.company ?? "") : "");
  const [email, setEmail] = useState(isEdit ? (props.initial.email ?? "") : "");
  const [phone, setPhone] = useState(isEdit ? (props.initial.phone ?? "") : "");
  const [source, setSource] = useState<Lead["source"]>(
    isEdit ? props.initial.source : "web",
  );
  const [estValue, setEstValue] = useState(
    isEdit ? (props.initial.estValue ?? "") : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("company", company);
    fd.set("email", email);
    fd.set("phone", phone);
    fd.set("source", source);
    fd.set("estValue", estValue);

    if (props.mode === "create") {
      const res = await createLeadAction(fd);
      setPending(false);
      if (res && !res.ok) {
        setError(res.error);
      }
      return;
    }

    const res = await updateLeadAction(props.leadId, fd);
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="source">Source</Label>
        <select
          id="source"
          name="source"
          value={source}
          onChange={(e) => setSource(e.target.value as Lead["source"])}
          className="flex h-10 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:focus-visible:outline-white"
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estValue">Estimated value ($)</Label>
        <Input
          id="estValue"
          name="estValue"
          type="number"
          min="0"
          step="1"
          value={estValue}
          onChange={(e) => setEstValue(e.target.value)}
          placeholder="0"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : props.mode === "create"
            ? "Create lead"
            : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
