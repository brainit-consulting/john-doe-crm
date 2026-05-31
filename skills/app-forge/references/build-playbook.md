# Build playbook — scaffold → plan → build → verify (M2–M5)

## M2 — Scaffold (via agenticbuilder-onboarding)
Drive onboarding **either way**: invoke `~/.claude/skills/agenticbuilder-onboarding` interactively, OR
execute its steps yourself with **spec-fed answers** (rename / env / DB / modules) — both are valid; the
spec-fed path is smoother for an autonomous build. Pre-feed everything the build model determines.

**Acquire the trunk (local-only when deferring remote).** To get the trunk WITHOUT creating a GitHub
repo, clone the template and detach origin: `gh repo clone brainit-consulting/agenticbuilder H:\<slug>`
then `git -C H:\<slug> remote remove origin`. Onboarding STEP 1 then sees a fresh agenticbuilder clone
and proceeds to rename. (This avoids onboarding STEP 0's `gh repo create`.)

**Rename** to the app's slug/title (onboarding STEP 2 + its rename-checklist) — `slug`/`appName` from the
build model, not re-prompted. A subagent does this mechanical multi-file edit well.

**Detect what the trunk already ships** before planning module installs. The trunk is NOT bare — it
typically already has auth, role-gates, admin, a dashboard, and the notes/chat/blob demos. List `src/`
+ `modules/` first; "install spec-implied modules" is usually a near no-op, and most spec features (the
domain itself, and things like dictation) are **bespoke**, not modules. **Spec wins** on module choice.

**Database — Vercel Marketplace Neon, and it works headlessly.** `vercel link --yes`, then
`vercel integration add neon --non-interactive` (the CLI auto-detects an agent and defaults to
non-interactive; flags: `--plan`, `--name`, `--no-env-pull`). This provisions a **Vercel-managed** Neon
DB — a DIFFERENT quota than a personal Neon org that may be at its project limit — connects it, and runs
env pull. **Gotcha:** `vercel env pull` REPLACES `.env.local`, dropping anything you added — re-add
`BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `OWNER_EMAIL` afterwards. If the spec dictates a different DB,
follow the spec. (`vercel` shims need `node` on PATH — on Windows prepend `C:\Program Files\Volta`.)

**No DB available? Build offline, defer the rest.** If you truly can't get a DATABASE_URL, still do
everything that doesn't need one: `npm install`, write the data model into `schema.ts`, `db:generate`
the migration, `typecheck`, and write the M3 plan — then defer `db:migrate` + run + sign-up and report
the DB as the single remaining step. (`drizzle.config` allows `db:generate` with a placeholder URL.)

**Defer** the GitHub repo + production promotion (local + DB only). Honour onboarding's anti-patterns:
never echo a secret, halt on failure, env via `src/lib/env.ts` first. If `H:\<slug>` already has a
`.agenticbuilder-onboarded` marker, resume/skip to M3.

End state of M2: `H:\<slug>` is a renamed trunk clone that **runs** (`npm run dev`) against a real Neon
DB with all migrations applied.

## M3 — Plan via writing-plans
Invoke `writing-plans` against the build model. The plan order: **data model → auth → core CRUD per
entity → primary screens**, bite-sized, saved into the new app's `docs/superpowers/plans/`. Present the
plan AND the MVP cut line to the user; get the go-ahead before building.

## M4 — Build via subagent-driven-development
Invoke `subagent-driven-development` to execute the plan with its two-stage (spec + quality) review.
- Schema first: edit the app's `src/lib/db/schema.ts`, then `npm run db:generate && npm run db:migrate`.
- Then auth/permissions wiring, then entity CRUD (server actions), then list/detail screens.
- Non-`mvpCore` features: leave a labeled stub (a page/section that says what it will do), never a
  silent omission.
- **Obey the scaffolded repo's own AGENTS.md/CLAUDE.md.** Read it before writing code. Follow its env
  rule (zod schema in `src/lib/env.ts` + `.env.example`), its DB workflow, "no UUIDs in UI", and the
  owner-bypass path.

## M5 — Verify & hand back
- Run the app's gate: `typecheck`, `lint`, `test` (whatever the app defines). All green.
- Start `npm run dev`; do the sign-up flow; confirm the core entity's CRUD works in the browser.
- Optionally run `check-app-production-readiness`.
- **Report:** a built-vs-stubbed table (every `mvpCore` item: done; every `outOfScope` item: stub),
  where the app runs, recorded assumptions (spec-silent defaults), and the **opt-in next steps**:
  create the GitHub repo + Vercel production deploy (only on the user's say-so).
