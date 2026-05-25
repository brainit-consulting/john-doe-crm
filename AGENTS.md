# AgenticBuilder — Agent Operating Manual

## 1. Project shape
- Next.js 16 App Router on Vercel. Better-Auth + Drizzle + Neon Postgres.
- Trunk runs without any module. `modules/` is a self-service shelf.
- Demo feature: `src/app/(app)/notes/` — read it before adding new features.

## 2. Before you touch Next.js code
Read `node_modules/next/dist/docs/` first. This repo pins Next.js 16.2.6;
its API differs from training-data Next.js in concrete ways:
- middleware lives in `proxy.ts` (root), not `middleware.ts`
- Cache Components: `'use cache'` directive + `cacheLife` / `cacheTag`
- React 19 APIs (`use()`, Actions, `<form action={fn}>`)

## 3. Design system (front-end work)

**Read [`docs/design-system.md`](./docs/design-system.md) before any UI change.**
It defines the brand colors, theme tokens, fonts (Patrick Hand for display
+ Inter for body), warm-neutral palette overrides, component variants,
and the inspiration source (theblackpot.dreamforgeworld.com).

The short version:
- **Brand orange**: `#C9892F` (`bg-brand`, `text-brand`)
- **Fonts**: `font-display` for h1-h3 + brand wordmark; default sans for body
- **Tailwind's `neutral-*` palette is overridden** to warm browns. `dark:bg-neutral-800` is warm dark brown, not cold grey. Don't assume cold.
- **Themes**: light (warm cream) and dark (warm dark brown), toggled via `<ThemeToggle>` from `@/components/theme-toggle`

This is the trunk default brand. Forks meant for a different brand family
should swap the tokens + fonts in one go (`globals.css` + `layout.tsx`) and
update the doc — don't sprinkle one-off overrides.

When you reach for a one-off color or font, stop and check the doc. If it's not a token, propose adding one.

## 4. Working rules
- **Plans**: non-trivial work goes through `plans/<NNN>-<slug>.md` first.
  When you complete a checklist item, update the plan in the same turn.
  Don't wait to be asked.
- **Status docs**: ongoing initiatives get a doc in `docs/<topic>.md` using
  `docs/_status-template.md`. Update it when state changes.
- **No UUIDs in UI**: always resolve IDs to human-readable labels before
  rendering. If you can't, the data model is wrong.
- **Owner bypass**: `OWNER_EMAIL` (env) bypasses every role/tier gate
  unconditionally. Test this path whenever you add a gate.
- **Env vars**: add to `src/lib/env.ts` (zod schema) AND `.env.example`.
  Never read `process.env.X` directly in app code.
- **DB changes**: edit `src/lib/db/schema.ts`, then
  `npm run db:generate && npm run db:migrate`. Commit the generated SQL.
- **Parallel agents (optional)**: this repo is friendly to parallel agent
  workflows — `.claude/worktrees/` is gitignored so tools like Claude
  Code's `claude agents` view can isolate sessions out of the box. Use
  it if you like; no convention here depends on it.
- **Client/server constants split**: any constant shared between server
  components AND client components MUST live in a separate module that
  doesn't import server-only code (DB client, `env.ts`, `auth/server.ts`).
  When a client component imports a constant from a server-only module,
  the bundler drags the whole module's transitive dependencies into the
  browser bundle — `env.ts` then throws "DATABASE_URL: expected string,
  received undefined" at module load. Put shared constants in a file
  like `src/lib/<feature>/constants.ts` and re-export from the
  server-only module if the server also uses them.
- **drizzle-kit `generate` in non-interactive shells**: when adding a new
  table while removing another (e.g., renaming a feature), drizzle-kit's
  diff prompts "Is X a rename of Y?" and requires a TTY. In CI / agent
  shells this hangs forever. Workaround: write the migration SQL by hand
  + the corresponding `meta/<NNNN>_snapshot.json` + bump
  `meta/_journal.json`. Use `drizzle-kit migrate` to apply (that one is
  non-interactive). Reference: apptracker's `0003_swap_notes_for_apps.sql`
  for the format.

## 5. Verification discipline
Before claiming "done":
- `npm run typecheck` passes
- `npm run lint` passes
- `npm test` passes (trunk has a small test surface; the vitest module
  expands it)
- For UI work: open the page in a browser and use the feature.
  Type-checking is not feature-checking.

## 6. Module installation
Modules live in `modules/<name>/`. Each has its own README — follow it
step-by-step. The onboarding skill at
`.claude/skills/agenticbuilder-onboarding/` automates this for new clones
(skill ships when modules ship; see Plan C).

## 7. Vercel
The Vercel CLI is expected to be installed and authenticated. Use it freely
for `vercel env pull`, `vercel deploy`, etc. Never commit `.env.local`.

## 8. Tone
Terse. Code over prose. No emojis unless asked.
