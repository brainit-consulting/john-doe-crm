import Link from "next/link";
import { env } from "@/lib/env";
import { NoteForm } from "../_components/NoteForm";

export default function NewNotePage() {
  const whisperEnabled = Boolean(env.OPENAI_API_KEY);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/notes" className="text-sm underline">
          ← Back to notes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New note</h1>
      </div>
      <NoteForm mode="create" whisperEnabled={whisperEnabled} />
    </div>
  );
}
