// Curated list of models offered to the chat UI. Every id is a Vercel AI
// Gateway model id (provider/model). To add a model, append an entry — the
// chat route trusts whatever the user picked because the gateway resolves
// (and bills) the actual provider on its end.
export type AiModel = {
  id: string;
  name: string;
  provider: string;
};

export const MODELS: readonly AiModel[] = [
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6", provider: "Anthropic" },
  { id: "anthropic/claude-opus-4.7", name: "Claude Opus 4.7", provider: "Anthropic" },
  { id: "openai/gpt-5", name: "GPT-5", provider: "OpenAI" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google" },
] as const;

export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.6";

export function findModel(id: string): AiModel | undefined {
  return MODELS.find((m) => m.id === id);
}
