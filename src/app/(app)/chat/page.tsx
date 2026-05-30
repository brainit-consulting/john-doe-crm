import { requireSession } from "@/lib/auth/roles";
import { MODELS, DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { ChatUI } from "./_components/ChatUI";

export default async function ChatPage() {
  await requireSession();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Chat</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Talk to a frontier model through the Vercel AI Gateway. Switch
          provider with the picker. Your next message uses the new model.
        </p>
      </div>
      <ChatUI defaultModelId={DEFAULT_MODEL_ID} models={[...MODELS]} />
    </div>
  );
}
