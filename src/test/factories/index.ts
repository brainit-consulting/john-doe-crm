import { nanoid } from "nanoid";
import { notes, user, type Note, type User } from "@/lib/db/schema";
import type { TestTx } from "../db";

/**
 * Insert a fresh user inside the given transaction. Defaults are random so
 * the row is unique even if two tests run in the same transaction (they
 * shouldn't, but defensive defaults make the factories safe to compose).
 */
export async function makeUser(
  tx: TestTx,
  overrides: Partial<User> = {},
): Promise<User> {
  const id = overrides.id ?? nanoid();
  const [row] = await tx
    .insert(user)
    .values({
      id,
      name: overrides.name ?? `Test User ${id.slice(0, 6)}`,
      email: overrides.email ?? `${id}@example.test`,
      emailVerified: overrides.emailVerified ?? true,
      image: overrides.image ?? null,
      role: overrides.role ?? "viewer",
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
    })
    .returning();
  return row;
}

/**
 * Insert a note for the given user. `userId` is required because notes have
 * a FK to user; passing it explicitly makes the factory call site obvious.
 */
export async function makeNote(
  tx: TestTx,
  userId: string,
  overrides: Partial<Note> = {},
): Promise<Note> {
  const id = overrides.id ?? nanoid();
  const [row] = await tx
    .insert(notes)
    .values({
      id,
      userId,
      title: overrides.title ?? `Note ${id.slice(0, 6)}`,
      body: overrides.body ?? "",
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
    })
    .returning();
  return row;
}
