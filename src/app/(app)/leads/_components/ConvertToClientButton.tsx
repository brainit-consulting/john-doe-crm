"use client";

import { useState } from "react";
import { convertToClientAction } from "../actions";
import { Button } from "@/components/ui/button";

export function ConvertToClientButton({ leadId }: { leadId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const res = await convertToClientAction(leadId);
    // If convertToClientAction redirects it never returns; if it returns an error:
    if (res && !res.ok) {
      setPending(false);
      setError(res.error);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        {pending ? "Converting…" : "Convert to client"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
