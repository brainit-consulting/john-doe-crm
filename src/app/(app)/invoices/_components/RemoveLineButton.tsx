"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeLineAction } from "../actions";

type Props = {
  invoiceId: string;
  lineId: string;
};

export function RemoveLineButton({ invoiceId, lineId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await removeLineAction(invoiceId, lineId);
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
      aria-label="Remove line"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
