import Link from "next/link";
import type { Note } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NoteList({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return (
      <Card>
        <div className="space-y-3 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            No notes yet. Notes are the demo feature. Write one to see the full
            create / edit / delete loop in action.
          </p>
          <Link href="/notes/new">
            <Button>Create your first note</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {notes.map((n) => (
        <li key={n.id}>
          <Link
            href={`/notes/${n.id}`}
            className="flex flex-col gap-1 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <span className="font-medium">{n.title}</span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {n.updatedAt.toLocaleString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
