---
name: app-forge
description: >-
  Build a runnable app from a written SPEC (+ diagrams) on the agenticbuilder trunk. Use whenever
  someone wants to BUILD, SCAFFOLD, or GENERATE a new app FROM a spec / requirements / functional doc —
  e.g. "build this app from the spec", "scaffold the app from these specs and diagrams", "turn this
  functional spec into a working app", "I have a spec for a greenfield app, build it". Ingests the spec
  (PDF/HTML) + diagrams from the app's local-docs folder, scaffolds a fresh project via
  agenticbuilder-onboarding, derives the data model / auth / features from the spec, and builds core
  CRUD + screens to a runnable MVP. The defining output is WORKING CODE built FROM a spec. NOT for:
  diagramming an existing spec (use diagram-forge); documenting an existing repo (use code-spec-forge);
  plain scaffolding with no spec (use agenticbuilder-onboarding directly). Triggers on a spec/requirements
  doc for a NEW app even without the word "build".
metadata:
  version: "1.0.0"
  author: forged alongside diagram-forge and code-spec-forge
---

# app-forge

Turn a **spec (+ diagrams) into a runnable app** on the agenticbuilder trunk. Third in the forge family:
`diagram-forge` (spec → diagrams), `code-spec-forge` (code → spec), and this — **spec → app**.

This skill ORCHESTRATES existing skills rather than reinventing them: `agenticbuilder-onboarding`
(scaffold), `diagram-forge` (produce missing diagrams), `writing-plans` (plan), and
`subagent-driven-development` (build). The deliverable is a **runnable MVP**, honestly scoped — core
entities' CRUD + auth + primary screens, with everything else as clearly labeled stubs.

## The overriding rule: the spec wins

On any conflict, the **spec is authoritative** — over agenticbuilder trunk defaults, onboarding
defaults, and diagram inferences. Where the spec is silent, pick a sensible default and record the
assumption in the final report; never invent a feature the spec doesn't ask for.

## Movements

### 1. Ingest → build model
Follow `references/build-model.md`. Read the spec (PDF via the Read tool; the faithful HTML) + diagrams
from `H:\AppTracker Docs\<slug>\`. If the spec HTML or an architecture/ERD diagram is missing, run
`diagram-forge` first to produce them. Build the structured **build model** (entities, actors,
features, integrations) and decide the **MVP cut line** (`mvpCore` vs `outOfScope`).

### 2. Scaffold via agenticbuilder-onboarding
Follow `references/build-playbook.md` §Scaffold. Drive `~/.claude/skills/agenticbuilder-onboarding`
to set up `H:\<slug>`: trunk clone + rename (slug/title from the spec), OWNER_EMAIL, **DB via the Vercel
Marketplace Neon integration**, the modules the spec implies (spec wins on module choice),
`db:generate`/`db:migrate`, run. Pre-feed spec-derived answers; pause only for genuine secret/verify
steps; defer the GitHub repo + production deploy. If `H:\<slug>` is already onboarded (marker present),
skip to movement 3.

### 3. Plan via writing-plans
Project the build model into a bite-sized implementation plan (data model → auth → core CRUD per entity
→ primary screens), saved into the new app's `docs/superpowers/plans/`. **Show the user the plan and the
MVP cut line; get the go-ahead** before building.

### 4. Build via subagent-driven-development
Execute the plan task-by-task with two-stage review. Schema + migrate, entity CRUD, list/detail screens,
auth/permissions/owner-bypass. Non-core features become labeled stubs. **Obey the scaffolded repo's own
AGENTS.md/CLAUDE.md** (env via `src/lib/env.ts` + `.env.example`; DB via `schema.ts` +
`db:generate`/`db:migrate`; no UUIDs in UI; owner bypass).

### 5. Verify & hand back
Run the app's `typecheck` + `lint` + `test`, start the dev server, and do the sign-up check. Optionally
run `check-app-production-readiness`. Report **built vs stubbed** (no silent gaps), where it runs, and
the opt-in next steps (create the GitHub repo + Vercel deploy).

## Rules
- **Spec wins** over every default, always.
- **MVP, honestly scoped.** Report the built-vs-stubbed split; never imply completeness.
- **Obey the target repo's manual.** Read its AGENTS.md/CLAUDE.md and follow it.
- **Reuse, don't reinvent.** onboarding, diagram-forge, writing-plans, subagent-driven-development;
  frontend-design / nextjs / vercel-* as references.
- **Resumable.** Lean on onboarding's `.agenticbuilder-onboarded` marker; re-runs continue, never clobber.
- **Confidentiality.** The client spec stays in its docs folder; the running app is the deliverable.

## Quickstart
1. Locate inputs in `H:\AppTracker Docs\<slug>\`; ensure diagrams exist (run diagram-forge if not).
2. Build the model + MVP cut line per `references/build-model.md`.
3. Scaffold `H:\<slug>` via agenticbuilder-onboarding (DB via Vercel Neon) per `references/build-playbook.md`.
4. writing-plans → show the plan → subagent-driven-development builds it.
5. Verify it runs; report built-vs-stubbed + opt-in deploy.
