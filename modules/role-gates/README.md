# role-gates

## What this gives you

Adds a `role` column to the `user` table (`'user' | 'admin'`, default `'user'`), a server-side `requireRole(role)` helper, a `<RequireRole>` client gate, and an unconditional `OWNER_EMAIL` bypass for every gate. Also replaces the trunk's `session!.user.id` non-null assertions with a typed `requireSession()` helper.

## Prerequisites

- Trunk only. No other modules required.

## Environment variables

| Key | Required | Where to get it | Example |
|---|---|---|---|
| `OWNER_EMAIL` | yes | Already in trunk; the email that bypasses every gate | `you@example.com` |

## Install

1. `npm install` (no new packages; `deps.json` is empty).
2. Copy `modules/role-gates/src/lib/auth/roles.ts` → `src/lib/auth/roles.ts`.
3. Copy `modules/role-gates/src/components/auth/RequireRole.tsx` → `src/components/auth/RequireRole.tsx`.
4. Add `role` column to `user` in `src/lib/db/schema.ts`:

   ```diff
    export const user = pgTable("user", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      email: text("email").notNull().unique(),
      emailVerified: boolean("email_verified").notNull().default(false),
      image: text("image"),
   +  role: text("role").notNull().default("user"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow(),
    });
   ```

5. In `src/lib/auth/server.ts`, expose `role` on the session user and auto-promote `OWNER_EMAIL` at signup:

   ```diff
    import { betterAuth } from "better-auth";
    import { drizzleAdapter } from "better-auth/adapters/drizzle";
    import { db } from "@/lib/db/client";
    import { env } from "@/lib/env";

    export const auth = betterAuth({
      database: drizzleAdapter(db, { provider: "pg" }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
   +  user: {
   +    additionalFields: {
   +      role: { type: "string", required: false, defaultValue: "user", input: false },
   +    },
   +  },
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 8,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
      },
   +  databaseHooks: {
   +    user: {
   +      create: {
   +        before: async (data) => {
   +          if (data.email === env.OWNER_EMAIL) {
   +            return { data: { ...data, role: "admin" } };
   +          }
   +          return { data: { ...data, role: "user" } };
   +        },
   +      },
   +    },
   +  },
    });

    export type Auth = typeof auth;
   ```

6. Retrofit trunk files to use `requireSession()`. In `src/app/(app)/layout.tsx`:

   ```diff
   -import { redirect } from "next/navigation";
   -import { headers } from "next/headers";
   -import { auth } from "@/lib/auth/server";
   +import { requireSession } from "@/lib/auth/roles";
    import { Navbar } from "./_components/Navbar";

    export default async function AppLayout({ children }: { children: React.ReactNode }) {
   -  const session = await auth.api.getSession({ headers: await headers() });
   -  if (!session) {
   -    redirect("/login");
   -  }
   +  const session = await requireSession();
      return (
        <>
          <Navbar userName={session.user.name} />
   ```

7. In `src/app/(app)/dashboard/page.tsx`:

   ```diff
   -import { headers } from "next/headers";
   -import { auth } from "@/lib/auth/server";
   +import { requireSession } from "@/lib/auth/roles";

    export default async function DashboardPage() {
   -  const session = await auth.api.getSession({ headers: await headers() });
   -  const userName = session?.user.name ?? "there";
   +  const session = await requireSession();
   +  const userName = session.user.name;
   ```

8. In `src/app/(app)/notes/page.tsx`:

   ```diff
   -import { headers } from "next/headers";
   -import { auth } from "@/lib/auth/server";
   +import { requireSession } from "@/lib/auth/roles";

    export default async function NotesPage() {
   -  const session = await auth.api.getSession({ headers: await headers() });
   -  const userId = session!.user.id;
   +  const session = await requireSession();
   +  const userId = session.user.id;
   ```

9. In `src/app/(app)/notes/[id]/page.tsx`:

   ```diff
   -import { headers } from "next/headers";
   -import { auth } from "@/lib/auth/server";
   +import { requireSession } from "@/lib/auth/roles";

    export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
      const { id } = await params;
   -  const session = await auth.api.getSession({ headers: await headers() });
   -  const note = await getNoteForUser(id, session!.user.id);
   +  const session = await requireSession();
   +  const note = await getNoteForUser(id, session.user.id);
   ```

10. In `src/app/(app)/notes/_actions.ts`, replace the local `requireUserId` helper with `requireSession`:

    ```diff
    -import { headers } from "next/headers";
     import { redirect } from "next/navigation";
     import { revalidatePath } from "next/cache";
     import { nanoid } from "nanoid";
    -import { auth } from "@/lib/auth/server";
    +import { requireSession } from "@/lib/auth/roles";
     import {
       createNote,
       updateNoteForUser,
       deleteNoteForUser,
     } from "@/lib/db/queries";
     import { noteInputSchema } from "./_schema";

    -async function requireUserId(): Promise<string> {
    -  const session = await auth.api.getSession({ headers: await headers() });
    -  if (!session) {
    -    redirect("/login");
    -  }
    -  return session.user.id;
    -}
    +async function requireUserId(): Promise<string> {
    +  const session = await requireSession();
    +  return session.user.id;
    +}
    ```

11. Run `npm run db:generate && npm run db:migrate`.

## Verify

1. Sign up a fresh user (NOT `OWNER_EMAIL`) → in `db:studio`, confirm `user.role = 'user'`.
2. Sign up with `OWNER_EMAIL` → confirm `user.role = 'admin'`.
3. From a `requireRole("admin")`-gated route as a non-admin → redirected to `/dashboard`. (Demo: the admin-scaffold module exercises this; without it, you can manually add a test route.)
4. `npm run typecheck && npm run lint && npm test && npm run build` all pass.

## Known limitations

- **Session staleness on role change.** Because Better-Auth caches the
  session for `session.updateAge` (default 1 day), a user whose role is
  changed via the admin UI will continue to see their old role until
  their next sign-in. If immediate revocation matters, call
  `auth.api.revokeSessions({ userId })` after the role mutation (the
  `admin-scaffold` module documents this where applicable).

## Uninstall

1. Remove `src/lib/auth/roles.ts` and `src/components/auth/RequireRole.tsx`.
2. Reverse the diffs in `src/lib/db/schema.ts`, `src/lib/auth/server.ts`, and the five pages/actions retrofitted.
3. Run `npm run db:generate && npm run db:migrate` (drop `role` column).
