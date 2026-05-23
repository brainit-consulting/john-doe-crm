# admin-scaffold

## What this gives you

Server-rendered `/admin/*` routes gated by `requireRole("admin")` from the `role-gates` module. Ships:

- `/admin` landing page with a user-count card.
- `/admin/users` paginated users list (20 per page) with a role editor (`user` | `admin`) on every row.
- A `setUserRoleAction` server action that revalidates the list after each role change.
- A conditional "Admin" link in the global navbar, visible only when `effectiveRole(session) === "admin"`.

Owner bypass is unconditional — the trunk's `OWNER_EMAIL` always sees the admin UI, even with `user.role = 'user'` in the DB.

## Prerequisites

- **`role-gates` MUST be installed first.** This module imports `requireRole` and `effectiveRole` from `@/lib/auth/roles`, both shipped by `role-gates`.
- No other modules required.

## Environment variables

| Key | Required | Where to get it | Example |
|---|---|---|---|
| `OWNER_EMAIL` | yes (already in trunk) | From `role-gates`; the email that always sees admin pages | `you@example.com` |

No new env vars beyond what `role-gates` already requires.

## Install

1. `npm install` (no new packages; `deps.json` is empty).

2. Add the user-management query helpers to `src/lib/db/queries.ts`:

   ```ts
   import { count } from "drizzle-orm";
   // (eq is already imported)
   import { type Role } from "@/lib/auth/roles";

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
     // Defensive: the type already constrains to "user" | "admin", but
     // refuse anything else at runtime in case this is called from untyped JS.
     if (role !== "user" && role !== "admin") {
       throw new Error(`Invalid role: ${String(role)}`);
     }
     await db
       .update(user)
       .set({ role, updatedAt: new Date() })
       .where(eq(user.id, userId));
   }
   ```

3. Copy `modules/admin-scaffold/src/app/(app)/admin/` → `src/app/(app)/admin/`.

4. Patch `src/app/(app)/_components/Navbar.tsx` to render an "Admin" link when the session is an admin. Change the component signature to accept `isAdmin` from the layout:

   ```diff
    import Link from "next/link";
    import { SignOutButton } from "./SignOutButton";

   -export function Navbar({ userName }: { userName: string }) {
   +export function Navbar({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
      return (
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="font-semibold">AgenticBuilder</Link>
              <Link href="/notes" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Notes</Link>
              <Link href="/chat" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Chat</Link>
   +          {isAdmin ? (
   +            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Admin</Link>
   +          ) : null}
            </nav>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">{userName}</span>
              <SignOutButton />
            </div>
          </div>
        </header>
      );
    }
   ```

5. Patch `src/app/(app)/layout.tsx` to compute `isAdmin` via `effectiveRole` and pass it to the navbar:

   ```diff
   -import { requireSession } from "@/lib/auth/roles";
   +import { effectiveRole, requireSession } from "@/lib/auth/roles";
    import { Navbar } from "./_components/Navbar";

    export default async function AppLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      const session = await requireSession();
   +  const isAdmin = effectiveRole(session) === "admin";
      return (
        <>
   -      <Navbar userName={session.user.name} />
   +      <Navbar userName={session.user.name} isAdmin={isAdmin} />
          <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
        </>
      );
    }
   ```

6. No schema changes; no migration. The `role` column was added by `role-gates`.

## Verify

1. Start dev server: `npx next dev -p 3010`.
2. Sign in as `OWNER_EMAIL` → "Admin" link appears in the navbar.
3. Click "Admin" → land on `/admin` → see the overview card with the user count and a link to `/admin/users`.
4. Visit `/admin/users` → see the table with all signed-up users.
5. Change a non-admin user's role to `admin` via the dropdown. The page revalidates; refresh and confirm the change persists. Run `SELECT id, email, role FROM "user" WHERE id = '<that id>';` in Neon to confirm the DB row.
6. Sign out. Sign in as the just-promoted user → "Admin" link is now visible for them too.
7. Sign in as a non-admin / unverified user → no "Admin" link in navbar, and direct nav to `/admin` redirects to `/dashboard` (via `requireRole`).
8. `npm run typecheck && npm run lint && npm test && npm run build` all pass.

## Uninstall

1. Remove `src/app/(app)/admin/` (the whole subtree).
2. Reverse the diffs in `src/app/(app)/_components/Navbar.tsx` and `src/app/(app)/layout.tsx`.
3. Remove `listUsers`, `getUserCount`, and `setUserRole` from `src/lib/db/queries.ts`.
4. No DB migration required (the `role` column stays — it belongs to `role-gates`).
