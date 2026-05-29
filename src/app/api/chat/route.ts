import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { requireSession } from "@/lib/auth/roles";
import { getModel } from "@/lib/ai/gateway";
import { DEFAULT_MODEL_ID, findModel } from "@/lib/ai/models";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatRequestBody = {
  messages: UIMessage[];
  modelId?: string;
};

const SYSTEM_PROMPT =
  "You are a concise, friendly assistant inside the John Doe CRM demo app. Keep replies short unless asked to elaborate.";

export async function POST(req: Request) {
  await requireSession();

  const { messages, modelId } = (await req.json()) as ChatRequestBody;
  const resolvedModelId = (modelId && findModel(modelId)?.id) ?? DEFAULT_MODEL_ID;

  const result = streamText({
    model: getModel(resolvedModelId),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  // Attach the model id to each assistant message as `messageMetadata` so the
  // client can render a "answered by X" badge. The callback fires on both
  // `start` and `finish` parts; we emit on `start` so the badge appears as
  // soon as the message renders.
  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "start") {
        return { modelId: resolvedModelId };
      }
      return undefined;
    },
  });
}
