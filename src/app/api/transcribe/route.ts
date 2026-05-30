/**
 * POST /api/transcribe
 *
 * Accepts a `multipart/form-data` body with an `audio` Blob, forwards it to
 * OpenAI's transcription endpoint, and returns `{ text }`.
 *
 * This is the optional Whisper path for T6 voice-note dictation. It is inert
 * until OPENAI_API_KEY is set — the client never offers the "Accurate" engine
 * without it; the 503 here is defense-in-depth.
 *
 * The Web Speech (browser) path requires NO key and works without this route.
 */
import { requireSession } from "@/lib/auth/roles";
import { env } from "@/lib/env";

// `fetch` to an external API + multipart parsing — needs the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  await requireSession();

  if (!env.OPENAI_API_KEY) {
    return Response.json(
      { error: "Transcription is not configured." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return Response.json({ error: "Missing audio." }, { status: 400 });
  }

  const upstream = new FormData();
  // Preserve the client-provided filename/extension so OpenAI dispatches on
  // the right container (Safari sends .m4a, Chrome .webm).
  const filename = audio instanceof File && audio.name ? audio.name : "audio.webm";
  upstream.set("file", audio, filename);
  upstream.set("model", "gpt-4o-mini-transcribe");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: upstream,
  });

  if (!res.ok) {
    const detail = await res.text();
    return Response.json(
      { error: "Transcription failed.", detail },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { text?: string };
  return Response.json({ text: data.text ?? "" });
}
