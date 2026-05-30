import { eq, desc, and, count } from "drizzle-orm";
import { db } from "./client";
import {
  attachment,
  notes,
  user,
  type Attachment,
  type Note,
  type User,
} from "./schema";
import type { Role } from "@/lib/auth/roles";

export async function getUserById(id: string): Promise<User | undefined> {
  const rows = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return rows[0];
}

export async function listNotesForUser(userId: string): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.createdAt));
}

export async function getNoteForUser(
  noteId: string,
  userId: string,
): Promise<Note | undefined> {
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function createNote(input: {
  id: string;
  userId: string;
  title: string;
  body: string;
}): Promise<Note> {
  const [row] = await db.insert(notes).values(input).returning();
  return row;
}

export async function updateNoteForUser(
  noteId: string,
  userId: string,
  patch: { title?: string; body?: string },
): Promise<Note | undefined> {
  const [row] = await db
    .update(notes)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning();
  return row;
}

export async function deleteNoteForUser(
  noteId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning({ id: notes.id });
  return rows.length > 0;
}

export async function listAttachmentsForNote(
  noteId: string,
  userId: string,
): Promise<Attachment[]> {
  return db
    .select()
    .from(attachment)
    .where(and(eq(attachment.noteId, noteId), eq(attachment.userId, userId)))
    .orderBy(desc(attachment.createdAt));
}

export async function createAttachment(input: {
  id: string;
  userId: string;
  noteId: string | null;
  url: string;
  pathname: string;
  size: number;
  contentType: string;
}): Promise<Attachment> {
  const [row] = await db.insert(attachment).values(input).returning();
  return row;
}

export async function deleteAttachmentForUser(
  attachmentId: string,
  userId: string,
): Promise<Attachment | undefined> {
  const [row] = await db
    .delete(attachment)
    .where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)))
    .returning();
  return row;
}

// ──────────────────────────────────────────────────────────────────
// admin-scaffold — user-management helpers
// ──────────────────────────────────────────────────────────────────

export async function listUsers(
  page: number,
  pageSize = 20,
): Promise<User[]> {
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * pageSize;
  return db
    .select()
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(pageSize)
    .offset(offset);
}

export async function getUserCount(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(user);
  return Number(row?.value ?? 0);
}

export async function setUserRole(
  userId: string,
  role: Role,
): Promise<void> {
  // Defensive: the type already constrains to "owner" | "rep" | "viewer", but refuse
  // anything else at runtime in case this is called from untyped JS.
  if (role !== "owner" && role !== "rep" && role !== "viewer") {
    throw new Error(`Invalid role: ${String(role)}`);
  }
  await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, userId));
}
