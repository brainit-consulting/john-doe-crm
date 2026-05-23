import Link from "next/link";
import { requireSession } from "@/lib/auth/roles";
import { listNotesForUser } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { NoteList } from "./_components/NoteList";

export default async function NotesPage() {
  const session = await requireSession();
  const userId = session.user.id;
  const notes = await listNotesForUser(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <Link href="/notes/new">
          <Button>New note</Button>
        </Link>
      </div>
      <NoteList notes={notes} />
    </div>
  );
}
