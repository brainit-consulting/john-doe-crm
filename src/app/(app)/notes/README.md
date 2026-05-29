# Notes — the demo feature

This is the reference feature for John Doe CRM. Every pattern a new
feature would need is exercised here exactly once. New contributors: read
this folder before adding features of your own.

## What each file teaches

| File | Pattern |
|---|---|
| `../../../lib/db/schema.ts` (notes table) | Drizzle schema with FK to user, default values, composite index |
| `../../../lib/db/queries.ts` | Typed query helpers (`listNotesForUser`, `getNoteForUser`, `createNote`, `updateNoteForUser`, `deleteNoteForUser`) |
| `_actions.ts` | Server Actions with auth check + zod validation at the boundary; redirects + `revalidatePath` for cache busting |
| `page.tsx` | Server Component list page |
| `new/page.tsx` | Pure Server Component wrapping a client form |
| `[id]/page.tsx` | Dynamic-segment page with `notFound()` for missing rows |
| `_components/NoteForm.tsx` | Client component that calls Server Actions with `FormData` |
| `_components/NoteList.tsx` | Empty-state pattern |
| `_components/DeleteButton.tsx` | Inline confirm pattern (no modal lib) |
| `error.tsx` / `loading.tsx` | Per-route React 19 boundaries |

## What's NOT in here (and why)

- Markdown rendering — would add a dependency for no extra pattern.
- Sharing / collaboration — would require multi-tenancy and a permissions
  pattern not yet in trunk.
- Search — out of scope for the demo; a real feature uses Postgres FTS or
  pg_trgm and lives in its own module.
- Tagging — adds another join table without teaching anything new.

## No-UUIDs rule

`id` is a `nanoid` string but the UI shows the title. If you find yourself
writing a UUID into UI text, the data model is wrong (see AGENTS.md §3).
