"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AiModel } from "@/lib/ai/models";

type AssistantMetadata = { modelId?: string };

// A small mutable holder so the transport's `body` callback (created once,
// at transport-construction time) can always read the latest picked model
// without rebuilding the transport on every state change.
type ModelHolder = { current: string };

function makeTransport(holder: ModelHolder) {
  return new DefaultChatTransport<UIMessage<AssistantMetadata>>({
    api: "/api/chat",
    body: () => ({ modelId: holder.current }),
  });
}

export function ChatUI({
  defaultModelId,
  models,
}: {
  defaultModelId: string;
  models: AiModel[];
}) {
  const [modelId, setModelId] = useState(defaultModelId);
  // Lazy initializer — the holder + transport are constructed once and reused
  // for the lifetime of the component. The picker mutates `holder.current`.
  const [{ holderRef, transport }] = useState(() => {
    const h: ModelHolder = { current: defaultModelId };
    return { holderRef: h, transport: makeTransport(h) };
  });

  useEffect(() => {
    holderRef.current = modelId;
  }, [holderRef, modelId]);

  const { messages, sendMessage, status, error } = useChat<UIMessage<AssistantMetadata>>({
    transport,
  });

  const [input, setInput] = useState("");
  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {messages.length === 0 ? "No messages yet" : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
        </span>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Model</span>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex h-[28rem] flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            Try: <em>say hi in one word</em>
          </p>
        )}
        {messages.map((m) => {
          const text = m.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");
          const meta = (m.metadata ?? {}) as AssistantMetadata;
          const answeredBy = m.role === "assistant" ? findModelName(models, meta.modelId) : null;
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col gap-1",
                m.role === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white",
                )}
              >
                {text || (m.role === "assistant" && isBusy ? "…" : "")}
              </div>
              {answeredBy && (
                <span className="text-[11px] text-neutral-500 dark:text-neutral-500">
                  via {answeredBy}
                </span>
              )}
            </div>
          );
        })}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error.message ?? "Something went wrong."}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={isBusy}
          autoFocus
        />
        <Button type="submit" disabled={isBusy || input.trim().length === 0}>
          {isBusy ? "…" : "Send"}
        </Button>
      </form>
    </div>
  );
}

function findModelName(models: AiModel[], id: string | undefined): string | null {
  if (!id) return null;
  return models.find((m) => m.id === id)?.name ?? id;
}
