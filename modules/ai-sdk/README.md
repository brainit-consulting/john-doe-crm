# ai-sdk

## What this gives you

A streaming chat UI at `/chat` powered by the [Vercel AI SDK](https://ai-sdk.dev)
and the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). One key
(`AI_GATEWAY_API_KEY`) fronts every provider, so the in-app model picker can
switch between Claude Sonnet 4.6 (default), Claude Opus 4.7, GPT-5, and
Gemini 2.5 Pro without configuring an account per provider. Each assistant
reply renders a small "via {model name}" badge so you can see which model
answered.

Server-side, `streamText({ model: gateway(modelId), messages, system })` does
the work and `result.toUIMessageStreamResponse()` returns an SSE stream the
`useChat` hook on the client consumes incrementally.

## Prerequisites

- The trunk's **role-gates** module (the `/api/chat` route calls
  `requireSession()` to redirect anonymous traffic to `/login`).
- A Vercel team with AI Gateway enabled and a `vck_…` API key from
  [Vercel Dashboard → AI Gateway → API keys](https://vercel.com/dashboard/ai-gateway).
- No DB schema changes.

## Environment variables

| Key | Required | Where to get it | Example |
|---|---|---|---|
| `AI_GATEWAY_API_KEY` | yes | Vercel Dashboard → AI Gateway → API keys (must start with `vck_`) | `vck_4swydBjOwcotalfOVfNGsuW5ZdDtdSKmnieJDG7v5oz9gl1YbR0jnqPS` |

## Install

1. `npm install ai@6.0.185 @ai-sdk/react@3.0.187`.

2. Add the gateway key to the zod schema in `src/lib/env.ts`:

   ```diff
    const envSchema = z.object({
      DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
      BETTER_AUTH_SECRET: z
        .string()
        .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
      BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
      OWNER_EMAIL: z.string().email("OWNER_EMAIL must be a valid email"),
      RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY must start with re_"),
      EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email address"),
   +  AI_GATEWAY_API_KEY: z.string().startsWith("vck_", "AI_GATEWAY_API_KEY must start with vck_"),
    });
   ```

   And add the same to `src/test/setup.ts` so unit tests pass:

   ```diff
    process.env.EMAIL_FROM = process.env.EMAIL_FROM ?? "no-reply@example.com";
   +process.env.AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY ?? "vck_test_default_for_unit_tests_only_padding_padding";
   ```

3. Copy the module's source files into `src/`:

   ```bash
   mkdir -p src/lib/ai "src/app/api/chat" "src/app/(app)/chat/_components"
   cp modules/ai-sdk/src/lib/ai/models.ts src/lib/ai/models.ts
   cp modules/ai-sdk/src/lib/ai/gateway.ts src/lib/ai/gateway.ts
   cp "modules/ai-sdk/src/app/api/chat/route.ts" "src/app/api/chat/route.ts"
   cp "modules/ai-sdk/src/app/(app)/chat/page.tsx" "src/app/(app)/chat/page.tsx"
   cp "modules/ai-sdk/src/app/(app)/chat/_components/ChatUI.tsx" "src/app/(app)/chat/_components/ChatUI.tsx"
   ```

4. Add a "Chat" link to the in-app navbar in
   `src/app/(app)/_components/Navbar.tsx`:

   ```diff
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="font-semibold">AgenticBuilder</Link>
          <Link href="/notes" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Notes</Link>
   +      <Link href="/chat" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Chat</Link>
        </nav>
   ```

5. Append `AI_GATEWAY_API_KEY` from `modules/ai-sdk/env.example` to your
   `.env.local`. Use the real `vck_…` value from the Vercel dashboard.

6. No DB migration is required — the chat module is stateless. (To persist
   conversations, layer the messages onto a future `chat` / `message` table;
   that's out of scope for the boilerplate.)

## Verify

1. Start the dev server: `npx next dev -p 3010`.
2. Sign in as a verified user (the email-resend module gates sign-in on
   email verification — if your only accounts are unverified, sign up a new
   account first and click the verification link before continuing).
3. Click **Chat** in the navbar. The chat panel mounts with the picker
   defaulted to Claude Sonnet 4.6.
4. Type `say hi in one word` → press **Send**. A reply streams in within
   ~5 seconds. The badge under the assistant bubble reads `via Claude
   Sonnet 4.6`.
5. Pick `GPT-5` (or any other entry) from the model dropdown. Send another
   message. The new reply streams in and its badge reads `via GPT-5`,
   confirming the picker is wired to the request body.
6. `npm run typecheck && npm run lint && npm test && npm run build` all
   pass.

If the response never arrives: open the browser network panel — the failing
`POST /api/chat` body usually carries the gateway error (most often a bad
`AI_GATEWAY_API_KEY` or a model id the gateway doesn't expose to your
team).

## Uninstall

1. Remove the copied source files:

   ```bash
   rm -rf src/lib/ai "src/app/api/chat" "src/app/(app)/chat"
   ```

2. Reverse the diff in `src/app/(app)/_components/Navbar.tsx` (drop the
   `/chat` link).

3. Reverse the diff in `src/lib/env.ts` and `src/test/setup.ts` — delete
   the `AI_GATEWAY_API_KEY` lines.

4. Remove `AI_GATEWAY_API_KEY` from `.env.local` and `.env.example`.

5. `npm uninstall ai @ai-sdk/react`.

6. No DB rollback needed.
