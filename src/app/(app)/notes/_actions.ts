"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { requireSession } from "@/lib/auth/roles";
import {
  createNote,
  updateNoteForUser,
  deleteNoteForUser,
} from "@/lib/db/queries";
import { noteInputSchema } from "./_schema";

export type NoteActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await requireSession();
  return session.user.id;
}

export async function createNoteAction(formData: FormData): Promise<NoteActionResult> {
  const userId = await requireUserId();
  const parsed = noteInputSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const id = nanoid();
  await createNote({ id, userId, title: parsed.data.title, body: parsed.data.body });
  revalidatePath("/notes");
  redirect(`/notes/${id}`);
}

export async function updateNoteAction(
  noteId: string,
  formData: FormData,
): Promise<NoteActionResult> {
  const userId = await requireUserId();
  const parsed = noteInputSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const updated = await updateNoteForUser(noteId, userId, parsed.data);
  if (!updated) {
    return { ok: false, error: "Note not found." };
  }
  revalidatePath("/notes");
  revalidatePath(`/notes/${noteId}`);
  return { ok: true };
}

export async function deleteNoteAction(noteId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteNoteForUser(noteId, userId);
  revalidatePath("/notes");
  redirect("/notes");
}
