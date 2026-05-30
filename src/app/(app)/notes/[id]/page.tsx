import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/roles";
import { getNoteForUser } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { NoteForm } from "../_components/NoteForm";
import { DeleteButton } from "../_components/DeleteButton";
import { Attachments } from "./_components/Attachments";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const note = await getNoteForUser(id, session.user.id);
  if (!note) {
    notFound();
  }
  const whisperEnabled = Boolean(env.OPENAI_API_KEY);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/notes" className="text-sm underline">
          ← Back to notes
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{note.title}</h1>
          <DeleteButton noteId={note.id} />
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Last edited {note.updatedAt.toLocaleString()}
        </p>
      </div>
      <NoteForm
        mode="edit"
        noteId={note.id}
        initialTitle={note.title}
        initialBody={note.body}
        whisperEnabled={whisperEnabled}
      />
      <Attachments noteId={note.id} userId={session.user.id} />
    </div>
  );
}
