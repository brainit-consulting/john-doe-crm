import { gateway } from "ai";
import type { LanguageModel } from "ai";

/**
 * Resolve a Vercel AI Gateway model id to a `LanguageModel` instance.
 *
 * The `gateway` provider is callable: `gateway("anthropic/claude-sonnet-4.6")`
 * returns a model bound to the AI Gateway. The gateway picks up the API key
 * from `AI_GATEWAY_API_KEY` automatically (zod-validated in `src/lib/env.ts`).
 *
 * To bypass the gateway (e.g., for a self-hosted Ollama provider), swap this
 * helper for `createOpenAICompatible(...)` or a direct provider — the rest of
 * the chat module talks to `LanguageModel`, not to `gateway` specifically.
 */
export function getModel(modelId: string): LanguageModel {
  return gateway(modelId);
}
