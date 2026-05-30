"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLeadScoreAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ScoreControl({
  leadId,
  currentScore,
}: {
  leadId: string;
  currentScore: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(currentScore));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0 || n > 100) {
      setError("Score must be 0–100");
      return;
    }
    setPending(true);
    setError(null);
    setSaved(false);
    const res = await setLeadScoreAction(leadId, n);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="w-24"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSave}
          disabled={pending}
        >
          {pending ? "Saving…" : "Set score"}
        </Button>
        {saved && (
          <span className="text-sm text-green-700 dark:text-green-400">Saved</span>
        )}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">0–100; higher = hotter</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
