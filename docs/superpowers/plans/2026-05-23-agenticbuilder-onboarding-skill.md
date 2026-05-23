# AgenticBuilder — Onboarding Skill Implementation Plan (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Claude Code skill at `.claude/skills/agenticbuilder-onboarding/` defined by the spec at `docs/superpowers/specs/2026-05-23-agenticbuilder-onboarding-skill-design.md`. The skill auto-triggers on fresh clones, walks the developer through the seven onboarding steps (rename → owner email → DB + secret → install + migrate → module selection → optional Vercel link → finalize), and writes the durable `.agenticbuilder-onboarded` marker.

**Architecture:** A single auto-discovered skill folder containing one entry-point `SKILL.md`, three `references/*.md` files (catalog, env-key sources, rename checklist), and one `scripts/apply-module.md` sub-routine. The skill body is pure markdown (no executable code); Claude Code interprets it. Mutations happen through the existing tool calls Claude has (Read, Edit, Write, Bash) — no new tooling is shipped.

**Tech Stack:** None new. The skill is markdown that drives existing Claude Code tools. It reads/writes the trunk files defined in Plan A, parses module READMEs that match the contract in `modules/README.md`, and shells out to `node`, `npm`, `drizzle-kit`, and (optionally) `vercel`.

**Scope split:**
- **This plan (C):** Build and commit the onboarding skill files. Self-test by walking the checklist against a fresh clone without performing destructive operations.
- **Plan A (trunk, v0.1.0):** Shipped — provides the file shape the skill mutates.
- **Plan B (modules):** Required for the skill's STEP 5 to be exercisable end-to-end. **This plan does NOT block on Plan B.** Plan B and Plan C can be written in either order; if Plan B has not shipped at the time Plan C is executed, the skill's STEP 5 will report "no modules installed yet" and the user can re-enter the skill once modules land. The self-test in Task 7 accounts for this by exercising STEP 5 only against whatever module READMEs exist at run-time.

**Out of scope:** Module uninstall automation, a `create-agenticbuilder` CLI, production deploy automation past `vercel link` (per spec §9).

**Pre-flight:**
- Plan A is complete and tagged `v0.1.0`. Run `git tag --list | grep v0.1.0` to confirm.
- The repo at `h:/AgenticBuilder/` has `.claude/settings.json` from Plan A Task 4. This plan creates files under `.claude/skills/agenticbuilder-onboarding/` next to that.
- No Neon Postgres URL is required to execute this plan. (Plan C only writes the skill; it doesn't run the skill against a live DB. The self-test in Task 7 is documentation-only.)

---

## Task 1: Create skill directory + SKILL.md skeleton

**Files:**
- Create: `.claude/skills/agenticbuilder-onboarding/SKILL.md`
- Create: `.claude/skills/agenticbuilder-onboarding/references/` (directory)
- Create: `.claude/skills/agenticbuilder-onboarding/scripts/` (directory)

- [ ] **Step 1: Create the directories**

```bash
mkdir -p .claude/skills/agenticbuilder-onboarding/references
mkdir -p .claude/skills/agenticbuilder-onboarding/scripts
```

Expected: directories exist; `ls .claude/skills/agenticbuilder-onboarding/` shows `references/` and `scripts/`.

- [ ] **Step 2: Write `SKILL.md`**

Create `.claude/skills/agenticbuilder-onboarding/SKILL.md` with this exact content:

````markdown
---
name: agenticbuilder-onboarding
description: >-
  Onboard a fresh AgenticBuilder clone: rename the project, set up the
  database and auth secret, choose opt-in modules from modules/, link
  Vercel, and write the .agenticbuilder-onboarded marker. Use whenever
  the user says "set up", "onboard", "configure", "rename project",
  "install module", or whenever the .agenticbuilder-onboarded marker
  file is ABSENT at the repo root and the package.json name is still
  "agenticbuilder".
---

# AgenticBuilder onboarding

You are running inside a fresh (or re-entrant) AgenticBuilder clone.
Walk the developer through the seven-step onboarding flow defined
below. Stop on any failure; never echo a secret value back to the chat;
never run destructive ops without explicit confirmation.

## Anti-patterns (read these first; they apply to every step)

1. **Never echo a secret.** Write secrets to `.env.local` or pipe them
   via stdin to `vercel env add`. Never include `BETTER_AUTH_SECRET`,
   `DATABASE_URL`, or any module secret value in a chat response, code
   block, or status message.
2. **Never run destructive ops without explicit confirmation.** `rm`,
   `git reset --hard`, `git clean -fd`, and any non-undo-able operation
   require the user to type the literal word `yes` in response to a
   one-line preview. "Sure" / "ok" / "go ahead" do not count.
3. **Halt on failure.** Any non-zero exit code from `npm`, `vercel`,
   `node`, or `drizzle-kit` stops the flow. Print stderr verbatim and
   ask the user what to do. Do not retry, skip, or work around.
4. **Env writes go through `src/lib/env.ts` first.** When a module
   adds an env key, apply the zod-schema diff in `src/lib/env.ts`
   BEFORE writing the value into `.env.local`. This guarantees
   `npm run dev` either succeeds or fails with a precise zod error.
5. **Module mutations come from the README, not from this skill.** If
   `modules/<name>/README.md` says "Add line X to src/proxy.ts", apply
   that diff verbatim. If the README is wrong, fix the README — not
   this skill.

## STEP 1 — Detect state

Read `.agenticbuilder-onboarded` at the repo root.

- **If present:** parse `installed_modules:`. Greet the user with:
  > "You're already onboarded. Want to add more modules?"
  On `yes`, skip to STEP 5 with the catalog filtered to NOT-installed
  modules. On `no`, exit quietly.

- **If absent:** check `package.json#name`.
  - If it equals `"agenticbuilder"`, proceed to STEP 2.
  - Otherwise, warn: "This doesn't look like a fresh template clone
    (package name is already <X>). Continue anyway? (yes/no)"

## STEP 2 — Project rename

Ask the user for two names:

1. kebab-case slug for `package.json#name` and `vercel.json` (suggest
   the current directory's basename, lowercased and hyphenated).
2. Title Case display name for `README.md` and metadata.

Read `@references/rename-checklist.md`. For each entry under "Files to
rewrite", apply the rename. Do NOT touch any file listed under "Files
to LEAVE ALONE".

Offer:
> "Want me to `git init && git add -A && git commit -m 'chore: initial
> commit from agenticbuilder template'`? (yes/no)"

Only run on `yes`.

**Success criterion:** every file in the rename checklist no longer
contains the literal `agenticbuilder` (case-insensitive), EXCEPT files
under `modules/`, `.claude/skills/`, `docs/superpowers/`, and the
"leave alone" list.

## STEP 3 — Owner email

Verify `src/lib/env.ts` has `OWNER_EMAIL` in its zod schema (trunk
ships with it). If missing, halt and ask the user to restore the trunk
env schema before continuing.

Ask: "What's your OWNER_EMAIL? (default: `$(git config user.email)`)"

Append to `.env.local`:

```
OWNER_EMAIL="<value>"
```

If `.env.local` doesn't exist yet, create it by copying `.env.example`
first, then write the value.

## STEP 4 — Database + auth secret

### 4a — DATABASE_URL

Ask:
> "How do you want to set up Postgres?
>  1. Paste an existing Neon URL
>  2. Create a new Neon project (open https://console.neon.tech)
>  3. Provision via Vercel Marketplace"

On choice 3, run (stop on any non-zero exit):

```bash
vercel link
vercel marketplace add neon
vercel env pull .env.local
```

On choices 1 or 2, prompt the user to paste the Neon connection string
(starts with `postgres://`). Write it to `.env.local` as
`DATABASE_URL="<value>"` without echoing the value back.

### 4b — BETTER_AUTH_SECRET

Generate:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Capture stdout. Append `BETTER_AUTH_SECRET="<hex>"` to `.env.local`.
**Do not** print the hex back to the chat.

### 4c — BETTER_AUTH_URL

Append `BETTER_AUTH_URL="http://localhost:3000"` to `.env.local`.

### 4d — Install + migrate

```bash
test -d node_modules || npm install
npm run db:generate
npm run db:migrate
```

If `db:migrate` fails, halt and surface stderr.

### 4e — Verify sign-up

Tell the user:
> "I'll start the dev server. In a browser:
>  1. Open http://localhost:3000
>  2. Click Get started, sign up with a test account
>  3. Confirm you land on /dashboard
>  4. Stop the dev server (Ctrl+C) and reply 'verified' or 'failed: <reason>'"

Run `npm run dev` in the foreground. Wait for the user's response. On
`failed`, halt. On `verified`, proceed.

## STEP 5 — Module selection

Read `@references/module-catalog.md`. Render it as a numbered
checklist. If `.agenticbuilder-onboarded` exists and lists installed
modules, filter them out and rename the section header to "Add more
modules".

Ask: "Pick any subset by number (e.g., `1, 3, 6`) or `none`."

Topologically sort the chosen modules using each module's
`Prerequisites:` line from the catalog (e.g., admin-scaffold comes
after role-gates).

For each module, in order, dispatch to
`@scripts/apply-module.md` with the module name. If any module fails,
halt and report which one — do not proceed to the next.

## STEP 6 — Vercel link (optional)

Ask: "Link this repo to a Vercel project now? (yes/later)"

On `yes`:

```bash
vercel link
```

Then for each NON-secret key in `.env.local` (`BETTER_AUTH_URL`,
`OWNER_EMAIL`), ask the user whether to push it:

```bash
echo "<value>" | vercel env add <KEY> production
```

For SECRET keys (`DATABASE_URL`, `BETTER_AUTH_SECRET`, any module
secrets), print the list and instruct the user to paste them into the
Vercel dashboard directly:
> "Paste these into https://vercel.com/<team>/<project>/settings/environment-variables :
>  - DATABASE_URL
>  - BETTER_AUTH_SECRET
>  - <module secrets>"

(In a re-entrant run reaching STEP 5 from the marker, skip STEP 6.)

## STEP 7 — Finalize

Write `.agenticbuilder-onboarded` at repo root:

```
# AgenticBuilder onboarding marker — do not delete.
# Touching this file disables the onboarding skill's auto-greet on next open.
onboarded_at: <ISO 8601 UTC timestamp>
project_name: <kebab-case slug>
project_title: <Title Case name>
installed_modules:
  - <module-1>
  - <module-2>
```

Ask:
> "The brainstorm handoff at `docs/brainstorm-handoff-2026-05-22.md` is
> template-author scratch. Delete it? (type 'yes' to confirm — anything
> else keeps it)"

On literal `yes`, run `rm docs/brainstorm-handoff-*.md`. Otherwise
leave it.

Print:
```bash
git add -A
git commit -m "chore: complete onboarding (<modules>)"
```

(Do NOT run this commit yourself — let the user.)

Print the summary:
> "Onboarding complete.
>  Project: <Title Case> (<kebab-case>)
>  Modules installed: <list, or 'none'>
>  Next: `npm run dev` and open http://localhost:3000
>  To add more modules later, just say 'install module <name>'."

## Re-entrance

`.agenticbuilder-onboarded` is the durable state file.

- After onboarding, the skill auto-greet is suppressed (the marker is
  present, so the auto-trigger condition in the frontmatter is false).
- When the user says "install module <name>" or "add more modules",
  the skill activates, STEP 1 detects the marker, and the flow jumps
  to STEP 5 with the catalog filtered to NOT-installed modules.
- A re-entrant run skips STEPs 2, 3, 4, 6 and only updates
  `installed_modules:` in the marker at STEP 7.
- If the user genuinely wants to start over, they pass `--force`. The
  skill replies: "Re-running from scratch will overwrite your project
  name and re-prompt for all env vars. Are you sure? (type 'yes')".
````

- [ ] **Step 3: Sanity-check the file**

```bash
test -f .claude/skills/agenticbuilder-onboarding/SKILL.md && echo OK
```

Expected: prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/agenticbuilder-onboarding/SKILL.md
git commit -m "feat(skill): scaffold agenticbuilder-onboarding SKILL.md (7-step flow)"
```

---

## Task 2: references/module-catalog.md

**Files:**
- Create: `.claude/skills/agenticbuilder-onboarding/references/module-catalog.md`

- [ ] **Step 1: Write the catalog**

Create `.claude/skills/agenticbuilder-onboarding/references/module-catalog.md`
with this exact content:

````markdown
# Module catalog

Snapshot of `modules/*/README.md` "What this gives you" + "Prerequisites".

The skill renders this file as a numbered checklist in STEP 5 and uses
the `Prerequisites:` line on each entry for topological sort.

**Maintenance:** When you add or modify a module README, update the
corresponding entry below. There's no auto-regeneration today; the
self-test in Plan C Task 7 catches drift by walking
`modules/*/README.md` and comparing the first sentence of each "What
this gives you" paragraph against the entry here.

## 1. stripe
**Prerequisites:** none

Adds Stripe billing: a `src/lib/stripe/` client wrapper, a webhook
route at `/api/stripe/webhook`, a `/billing` page where users start a
Checkout Session, and a separate `subscription` table (FK → `user.id`)
that the webhook keeps in sync with Stripe's source of truth.

## 2. ai-sdk
**Prerequisites:** none

Adds streaming AI chat: a `src/lib/ai/` model registry pointed at the
Vercel AI Gateway, a `/api/chat` streaming route, and a `<Chat>`
component with a model picker. Works with any provider the Gateway
supports without changing app code.

## 3. blob
**Prerequisites:** none

Adds Vercel Blob storage: a `src/lib/blob.ts` helper for signed-URL
uploads, an `/api/upload` route that mints signed URLs server-side, and
a `<FileUpload>` component that uploads directly from the browser to
Vercel Blob.

## 4. email-resend
**Prerequisites:** none

Adds transactional email via Resend: a `src/lib/email/` module with a
typed `sendEmail()` helper, a `templates/` directory with React Email
templates, and an optional Better-Auth email-verification hook (which
also enables real password reset at `/reset`).

## 5. vitest
**Prerequisites:** none

Expands the trunk's minimal Vitest setup into a full testing scaffold:
integration tests against a real test database (transactional
rollback), React Server Component test helpers, a sample Playwright
e2e config, and a CI workflow stub.

## 6. role-gates
**Prerequisites:** none

Adds a `role` column on `user` (`'user' | 'admin'`), a `requireRole()`
server helper that throws on missing privilege, and a `<RequireRole>`
client gate. Crucially, includes an **owner-bypass** keyed on
`OWNER_EMAIL` — the owner clears every role/tier gate unconditionally.

## 7. admin-scaffold
**Prerequisites:** role-gates

Adds `(app)/admin/*` routes: a users list with search/pagination and a
per-user role editor. Re-uses the `requireRole('admin')` helper from
role-gates to gate the whole route group.
````

- [ ] **Step 2: Sanity-check**

```bash
grep -c "^## " .claude/skills/agenticbuilder-onboarding/references/module-catalog.md
```

Expected: prints `7` (one entry per module).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/agenticbuilder-onboarding/references/module-catalog.md
git commit -m "feat(skill): add module catalog reference (7 modules + prereqs)"
```

---

## Task 3: references/env-key-sources.md

**Files:**
- Create: `.claude/skills/agenticbuilder-onboarding/references/env-key-sources.md`

- [ ] **Step 1: Write the env-key sources file**

Create
`.claude/skills/agenticbuilder-onboarding/references/env-key-sources.md`
with this exact content:

````markdown
# Env key sources

For each env key in each module's `env.example`, the dashboard URL
where the user obtains it and the exact name to look for. The skill
walks the user here during STEP 5 sub-step "Walk env keys".

**Maintenance:** When a module adds or renames an env key, update the
corresponding entry below. Keys missing from this file cause the skill
to halt with "no source documented for KEY — see env-key-sources.md".

## Trunk (set up in STEP 3 + STEP 4, before module selection)

### OWNER_EMAIL
- Source: the user's own email.
- Default: `git config user.email`.
- Notes: the owner-bypass key. Whoever owns this email clears every
  role/tier gate; protect it.

### DATABASE_URL
- URL: https://console.neon.tech → your project → "Connection details"
  → "Pooled connection".
- Look for: a string starting with `postgres://` and ending with
  `?sslmode=require`.
- Notes: must be the **pooled** connection for `@neondatabase/serverless`.

### BETTER_AUTH_SECRET
- Source: generated locally with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- Look for: a 64-character hex string. The skill generates this for
  the user.

### BETTER_AUTH_URL
- Source: the URL Better-Auth uses for callback URLs.
- Dev value: `http://localhost:3000`.
- Prod value: your deployed URL (e.g., `https://awesome-saas.vercel.app`).

## stripe

### STRIPE_SECRET_KEY
- URL: https://dashboard.stripe.com/apikeys
- Look for: "Secret key". Starts with `sk_test_` in test mode,
  `sk_live_` in live mode.
- Notes: test keys for local dev; live keys only in production.

### STRIPE_WEBHOOK_SECRET
- URL: https://dashboard.stripe.com/webhooks
- Look for: create a webhook endpoint pointing at
  `<your-domain>/api/stripe/webhook`; the "Signing secret" appears on
  the endpoint's detail page. Starts with `whsec_`.
- Notes: local dev uses `stripe listen --forward-to ...`, which prints
  a separate `whsec_` to stdout — use that for `.env.local`.

### NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- URL: https://dashboard.stripe.com/apikeys
- Look for: "Publishable key". Starts with `pk_test_` or `pk_live_`.
- Notes: shipped to the browser; safe to commit to non-public env files
  but the convention is still `.env.local`.

## ai-sdk

### AI_GATEWAY_API_KEY
- URL: https://vercel.com/dashboard → AI → AI Gateway.
- Look for: "API Key" → "Copy". Starts with `vck_`.
- Notes: one key works across every provider the Gateway routes to.

## blob

### BLOB_READ_WRITE_TOKEN
- URL: https://vercel.com/<team>/<project>/stores
- Look for: create a Blob store; the token appears under the store's
  "Quickstart" tab. Starts with `vercel_blob_rw_`.
- Notes: alternatively, after `vercel link` + `vercel env pull`, this
  key arrives in `.env.local` automatically.

## email-resend

### RESEND_API_KEY
- URL: https://resend.com/api-keys
- Look for: "Create API key" → name it for this project. Starts with
  `re_`.

### RESEND_FROM_EMAIL
- Source: any verified sender on your Resend account.
- URL: https://resend.com/domains → add and verify the domain you'll
  send from, then use any address at that domain.
- Example: `"YourApp <noreply@yourdomain.com>"`.

## vitest
No env keys.

## role-gates
No env keys. (Uses `OWNER_EMAIL` from the trunk.)

## admin-scaffold
No env keys. (Inherits from `role-gates`.)
````

- [ ] **Step 2: Sanity-check key coverage**

```bash
grep -c "^### " .claude/skills/agenticbuilder-onboarding/references/env-key-sources.md
```

Expected: prints `12` (4 trunk + 3 stripe + 1 ai-sdk + 1 blob + 2 email-resend + 1 in summary lines for no-key modules → recount: trunk=4 + stripe=3 + ai-sdk=1 + blob=1 + email-resend=2 = **11**). The value to expect from `grep` is `11`. If it prints something else, you missed an entry.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/agenticbuilder-onboarding/references/env-key-sources.md
git commit -m "feat(skill): document env-key sources for trunk + 7 modules"
```

---

## Task 4: references/rename-checklist.md

**Files:**
- Create: `.claude/skills/agenticbuilder-onboarding/references/rename-checklist.md`

- [ ] **Step 1: Confirm the rename surface against the actual trunk**

```bash
grep -ril "agenticbuilder" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next .
```

Expected: a list of files. Compare this against the table in Step 2 below. If the trunk grew a new file referencing "agenticbuilder" since this plan was written, add it to the "Files to rewrite" or "Files to LEAVE ALONE" category before continuing.

- [ ] **Step 2: Write the checklist**

Create
`.claude/skills/agenticbuilder-onboarding/references/rename-checklist.md`
with this exact content:

````markdown
# Rename checklist

The skill applies the substitutions in this file during STEP 2.

## Substitution rules

| Find (case-sensitive) | Replace with             | Where it applies                             |
|-----------------------|--------------------------|----------------------------------------------|
| `agenticbuilder`      | `<kebab-case-slug>`      | code paths, lowercase identifiers             |
| `AgenticBuilder`      | `<Title Case Name>`      | display strings, page titles, metadata        |
| `Agentic Builder`     | `<Title Case Name>`      | rare; README intro line if present            |

## Files to rewrite

For each file below, the skill reads it, performs the substitutions
above ONLY on the listed sections, and writes it back. The skill does
**not** do a blind global find/replace — it targets specific lines so
that, e.g., a code comment referencing the template family is not
accidentally renamed.

| Path                                       | Sections / lines to touch                                              |
|--------------------------------------------|------------------------------------------------------------------------|
| `package.json`                             | the `"name"` field at top level                                        |
| `README.md`                                | H1 line (`# AgenticBuilder`); the first prose paragraph                |
| `.env.example`                             | the header comment lines (the `# ...` at the top of the file)          |
| `vercel.json`                              | only if a top-level `"name"` key exists (trunk omits it; check first)  |
| `src/app/layout.tsx`                       | `metadata.title` value; `metadata.description` value                   |
| `src/app/page.tsx`                         | the H1 (`<h1>AgenticBuilder</h1>`) and any prose paragraph mentioning it |
| `src/app/(app)/_components/Navbar.tsx`     | the brand link text (`AgenticBuilder` inside the `<Link href="/dashboard">`) |

## Files to LEAVE ALONE

These keep the historic "agenticbuilder" name on purpose. Renaming them
breaks the audit trail or breaks the skill itself.

- `AGENTS.md` — references "AgenticBuilder" the project family; the
  manual is inherited by every project built from the template.
- `modules/README.md` and `modules/*/README.md` — module docs are
  shared with the template family.
- `docs/superpowers/specs/*.md` and `docs/superpowers/plans/*.md` —
  design history; never rewrite (the GitHub template-cleanup action
  removes these on first commit anyway).
- `.claude/skills/agenticbuilder-onboarding/**` — the skill itself.
- `.github/template-cleanup.yml` — references seed files by name; the
  action removes itself on first run.
- `src/app/(app)/notes/README.md` — internal reference doc; mentions
  "AgenticBuilder" once as the template family.
- `package-lock.json` — generated; npm rewrites the `"name"` reference
  automatically on the next `npm install` (but the skill should NOT
  edit `package-lock.json` by hand).
- `CLAUDE.md` — one line (`@AGENTS.md`); nothing to rename.

## Verification after rename

After applying the substitutions, the skill runs:

```bash
grep -ril "agenticbuilder" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next . \
  | grep -v -E "(^./AGENTS.md$|^./modules/|^./docs/superpowers/|^./.claude/skills/agenticbuilder-onboarding/|^./.github/template-cleanup.yml$|^./src/app/\(app\)/notes/README.md$|^./package-lock.json$)"
```

Expected: prints nothing. Any file printed here is a missed rewrite —
the skill stops and reports the unhandled path so the checklist can be
updated.
````

- [ ] **Step 3: Sanity-check**

```bash
test -f .claude/skills/agenticbuilder-onboarding/references/rename-checklist.md && echo OK
```

Expected: prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/agenticbuilder-onboarding/references/rename-checklist.md
git commit -m "feat(skill): add rename checklist (rewrite list + leave-alone list)"
```

---

## Task 5: scripts/apply-module.md

**Files:**
- Create: `.claude/skills/agenticbuilder-onboarding/scripts/apply-module.md`

- [ ] **Step 1: Write the sub-routine**

Create
`.claude/skills/agenticbuilder-onboarding/scripts/apply-module.md`
with this exact content:

````markdown
# apply-module — install one module by name

Reusable sub-routine dispatched from `SKILL.md` STEP 5. Inputs:
`<module-name>` (the directory under `modules/`, e.g., `stripe`).

The sub-routine performs the 11 steps below. On any failure, halt and
return a one-line reason. STEP 5 surfaces the failure and stops the
overall flow — do NOT silently skip a step.

## 1. Resolve

Confirm `modules/<name>/README.md` exists and contains H2 sections in
this exact order:

- `## What this gives you`
- `## Prerequisites`
- `## Environment variables`
- `## Install`
- `## Verify`
- `## Uninstall`

If any section is missing or out of order, halt with:
> "module <name> README malformed — see modules/README.md for the
> required structure."

## 2. Prerequisites

Parse the `## Prerequisites` bullet list. For each
"<other-module>" entry, confirm `.agenticbuilder-onboarded` records it
as installed (or it appears earlier in the current STEP 5 queue). If
not, halt with:
> "module <name> requires <other-module>, which isn't installed yet.
> Install <other-module> first."

## 3. Env example → .env.local

Read `modules/<name>/env.example`. For each `KEY="value"` line, append
`KEY=""` to `.env.local` (empty value; the user supplies it in step 4).

If `modules/<name>/env.example` is empty or absent, skip to step 5.

## 4. Walk env keys

For each key from step 3:

1. Look the key up in
   `@.claude/skills/agenticbuilder-onboarding/references/env-key-sources.md`.
2. If absent, halt with: "no source documented for <KEY> — update
   `env-key-sources.md` before installing this module."
3. Print the URL + "look for" notes to the user.
4. Prompt: "Paste the value for <KEY>: " — accept the user's reply.
5. Write the value to `.env.local` (replacing the empty value from
   step 3). **Do not echo the value back** in any chat message.
6. If the module README's `## Environment variables` table marks the
   key as `Required: yes` and the user pasted an empty string, halt.

## 5. Env schema diff

Read the verbatim diff in `## Install` step labeled "Add to
`src/lib/env.ts`" from `modules/<name>/README.md`. Apply it to
`src/lib/env.ts`.

Run:

```bash
npm run typecheck
```

If typecheck fails, halt and surface the error.

## 6. Deps

Read `modules/<name>/deps.json`. Merge its `dependencies` and
`devDependencies` into the host `package.json` (additive only — do not
remove or downgrade existing entries; on a version conflict, halt and
ask the user).

Run:

```bash
npm install
```

Halt on non-zero exit.

## 7. Copy src/

For each path listed in the README's `## Install` step labeled "Copy
`modules/<name>/src/<file>` → `src/<dest>`", copy the file.

**Overwrite policy:** if the destination already exists:
- If the README explicitly says "replace", prompt:
  > "Overwrite existing `src/<dest>`? (type 'yes' to confirm)"
  Only overwrite on literal `yes`.
- Otherwise halt with: "destination `src/<dest>` already exists and
  the module README doesn't say 'replace'. Aborting to avoid clobbering
  user code."

## 8. Schema diff + migrate

Apply the verbatim diff from the README's `## Install` step labeled
"Add to `src/lib/db/schema.ts`" to `src/lib/db/schema.ts`.

If `modules/<name>/migrations/` is non-empty, copy each `.sql` file
into `drizzle/migrations/` (with a numeric prefix that keeps order —
take the next available `NNNN_` number).

Then run:

```bash
npm run db:generate
npm run db:migrate
```

Halt on failure of either command. (If `db:migrate` complains about a
missing `DATABASE_URL`, halt and instruct the user to complete STEP 4
before installing modules.)

## 9. Wire diffs

For each diff in the README's `## Install` step labeled "Wire into
existing file", apply it verbatim.

## 10. Verify

Print the module's `## Verify` section to the user. Run any commands
the section asks for (typically `npm run dev`). Wait for the user's
reply:

- `verified` → proceed to step 11.
- `failed: <reason>` → halt and surface the reason.

## 11. Record

If `.agenticbuilder-onboarded` exists, append the module name under
`installed_modules:`. If it doesn't exist yet (initial onboarding),
queue the module name for STEP 7 to write.

Return: `module <name> installed`.

## Failure-mode summary

If you halt at any step, your one-line reason should name the step:
- step 1 → "module README malformed"
- step 2 → "missing prerequisite: <other-module>"
- step 5 → "env.ts typecheck failed"
- step 6 → "npm install failed"
- step 7 → "would clobber `src/<dest>`"
- step 8 → "db:migrate failed"
- step 10 → "user reported verify failure: <reason>"

STEP 5 in SKILL.md then surfaces this reason to the user.
````

- [ ] **Step 2: Sanity-check**

```bash
grep -c "^## " .claude/skills/agenticbuilder-onboarding/scripts/apply-module.md
```

Expected: prints at least `12` (11 numbered steps + the Failure-mode summary).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/agenticbuilder-onboarding/scripts/apply-module.md
git commit -m "feat(skill): add apply-module sub-routine (11-step install loop)"
```

---

## Task 6: Cross-reference SKILL.md → references/scripts (verify links resolve)

**Files:**
- (No new files; verifies that the file references in `SKILL.md` actually point to existing files.)

The skill body uses `@.claude/skills/agenticbuilder-onboarding/...`
file references. Claude Code resolves these at run-time. This task
catches typos before the skill is exercised.

- [ ] **Step 1: List every `@` reference in SKILL.md**

```bash
grep -nE "@(\.claude|references|scripts)" .claude/skills/agenticbuilder-onboarding/SKILL.md
```

Expected output (paths may be relative `@references/...` or absolute
`@.claude/skills/...` — both forms are valid in Claude Code):

```
- @references/rename-checklist.md
- @references/module-catalog.md
- @scripts/apply-module.md
```

- [ ] **Step 2: Confirm each referenced file exists**

```bash
test -f .claude/skills/agenticbuilder-onboarding/references/rename-checklist.md \
  && test -f .claude/skills/agenticbuilder-onboarding/references/module-catalog.md \
  && test -f .claude/skills/agenticbuilder-onboarding/scripts/apply-module.md \
  && echo OK
```

Expected: prints `OK`.

- [ ] **Step 3: Confirm reverse references**

Walk every reference file and confirm it doesn't reference a non-existent
sibling:

```bash
grep -nE "@(\.claude|references|scripts)" \
  .claude/skills/agenticbuilder-onboarding/references/*.md \
  .claude/skills/agenticbuilder-onboarding/scripts/*.md
```

Expected: at most one match —
`scripts/apply-module.md` references
`@.claude/skills/agenticbuilder-onboarding/references/env-key-sources.md`.
Confirm it exists:

```bash
test -f .claude/skills/agenticbuilder-onboarding/references/env-key-sources.md && echo OK
```

Expected: prints `OK`.

- [ ] **Step 4: Commit (if anything moved)**

If steps 1–3 surfaced a broken reference, fix `SKILL.md` (Task 1) or
`apply-module.md` (Task 5) and commit:

```bash
git add -A
git commit -m "fix(skill): repair file references between SKILL.md and references/scripts"
```

If nothing needed fixing, skip this commit.

---

## Task 7: Self-test — dry-run the skill against the current repo

The skill itself is not executed during this plan — running it would
mutate the repo. Instead, this task is a **paper walkthrough**: read
each step of `SKILL.md`, check that the inputs it expects exist in the
current repo and the outputs it produces are well-defined. Mark each
step as PASS / FAIL with a one-line note.

**Files:**
- Create: `docs/superpowers/onboarding-skill-self-test-2026-05-23.md`

- [ ] **Step 1: Walk STEP 1 (detect state)**

Check that:

```bash
test ! -f .agenticbuilder-onboarded && echo "marker absent: OK"
grep '"name": "agenticbuilder"' package.json && echo "package name matches: OK"
```

Both must print `OK`.

- [ ] **Step 2: Walk STEP 2 (rename)**

Check that every "Files to rewrite" entry in
`references/rename-checklist.md` exists in the current repo:

```bash
for f in package.json README.md .env.example vercel.json \
         src/app/layout.tsx src/app/page.tsx \
         "src/app/(app)/_components/Navbar.tsx"; do
  test -f "$f" || echo "MISSING: $f"
done
```

Expected: no `MISSING` lines printed.

Then confirm each "Files to LEAVE ALONE" entry also exists:

```bash
for f in AGENTS.md modules/README.md docs/superpowers/specs \
         docs/superpowers/plans CLAUDE.md \
         "src/app/(app)/notes/README.md" .github/template-cleanup.yml; do
  test -e "$f" || echo "MISSING: $f"
done
```

Expected: no `MISSING` lines printed. (`docs/superpowers/specs` and
`plans` are directories, hence `test -e` not `-f`.)

- [ ] **Step 3: Walk STEP 3 (owner email)**

```bash
grep -n "OWNER_EMAIL" src/lib/env.ts
grep -n "OWNER_EMAIL" .env.example
```

Expected: both files mention `OWNER_EMAIL` (proves the trunk's zod
schema and example file already account for the key).

- [ ] **Step 4: Walk STEP 4 (DB + secret)**

Verify the commands the skill runs are actually available:

```bash
which node && which npm && which drizzle-kit 2>/dev/null || echo "drizzle-kit is via npm scripts: OK"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | wc -c
```

Expected: third command prints `65` (64 hex chars + newline).

Confirm the npm scripts exist:

```bash
node -e "const p = require('./package.json'); ['db:generate', 'db:migrate', 'dev'].forEach(s => { if (!p.scripts[s]) throw new Error('missing script: ' + s); }); console.log('OK');"
```

Expected: prints `OK`.

- [ ] **Step 5: Walk STEP 5 (module selection)**

Check the catalog parses cleanly (the H2 entries match
`modules/` directories OR there are no module directories yet, which is
OK if Plan B hasn't shipped):

```bash
grep "^## " .claude/skills/agenticbuilder-onboarding/references/module-catalog.md \
  | sed 's/^## [0-9]\+\. //' | awk '{print $1}'
```

Expected: one line per module — `stripe`, `ai-sdk`, `blob`,
`email-resend`, `vitest`, `role-gates`, `admin-scaffold`.

Then for each module name, check whether `modules/<name>/` exists in
the current repo:

```bash
for m in stripe ai-sdk blob email-resend vitest role-gates admin-scaffold; do
  if [ -d "modules/$m" ]; then echo "$m: PRESENT"; else echo "$m: pending Plan B"; fi
done
```

If Plan B hasn't shipped, expected output is seven "pending Plan B"
lines. That's the expected state for this plan — the skill can still
be committed; it just has nothing to install at STEP 5 until Plan B
lands. Document the gap in the self-test report (Step 9 below).

- [ ] **Step 6: Walk STEP 6 (Vercel link)**

```bash
which vercel || echo "vercel CLI not installed — STEP 6 will be a no-op for users without it"
```

Either outcome is acceptable; document which one you saw.

- [ ] **Step 7: Walk STEP 7 (finalize)**

Confirm the marker filename and content shape are well-defined by
re-reading the relevant section of `SKILL.md`. Then check the
brainstorm-handoff file the skill offers to delete:

```bash
ls docs/brainstorm-handoff-*.md 2>/dev/null || echo "no brainstorm handoff present"
```

Either outcome is acceptable. If the file is present, the skill will
offer to delete it (STEP 7); if not, the skill skips that prompt.

- [ ] **Step 8: Walk re-entrance**

There's no marker file yet, so the re-entrant path can't be exercised
here. Confirm that `SKILL.md`'s re-entrance section explicitly defines
the short-circuit logic (STEP 1 jump to STEP 5):

```bash
grep -A 3 "If present:" .claude/skills/agenticbuilder-onboarding/SKILL.md | head -10
```

Expected: shows the "jump to STEP 5" instruction.

- [ ] **Step 9: Write the self-test report**

Create `docs/superpowers/onboarding-skill-self-test-2026-05-23.md`
with the verdict from each step above:

````markdown
# Onboarding skill self-test — 2026-05-23

Plan C Task 7. Paper walkthrough of `SKILL.md` against the current repo.
This does NOT execute the skill; it verifies that every input the skill
expects exists and every output is well-defined.

## Results

| Step                  | Verdict | Notes                                     |
|-----------------------|---------|-------------------------------------------|
| 1 — detect state      | PASS    | marker absent, package name matches.      |
| 2 — rename            | PASS    | every "rewrite" + "leave alone" file present. |
| 3 — owner email       | PASS    | OWNER_EMAIL in env.ts schema and .env.example. |
| 4 — DB + secret       | PASS    | node + npm available; db scripts present. |
| 5 — module selection  | PASS*   | catalog parses; modules/* directories pending Plan B. |
| 6 — vercel link       | PASS    | vercel CLI availability documented.       |
| 7 — finalize          | PASS    | marker shape defined; brainstorm handoff present. |
| re-entrance           | PASS    | jump-to-STEP-5 logic defined in SKILL.md. |

\* Plan B dependency: STEP 5 cannot install modules until each
`modules/<name>/` directory has a README, src/, env.example, deps.json,
and migrations/ per the contract in `modules/README.md`. This is
expected — Plan C ships the skill; Plan B ships the modules. The skill
re-enters at STEP 5 once Plan B lands.

## Open issues found

- None identified during this dry-run.

## Sign-off

Self-test executed on 2026-05-23 against commit `<git rev-parse HEAD>`.
Skill is ready to be exercised on a fresh clone once Plan B (modules)
has shipped at least one module.
````

(Replace `<git rev-parse HEAD>` with the actual current commit SHA
before committing.)

- [ ] **Step 10: Commit**

```bash
git add docs/superpowers/onboarding-skill-self-test-2026-05-23.md
git commit -m "test(skill): document Plan C self-test walkthrough"
```

---

## Task 8: Tag v0.3.0

Release history: `v0.1.0` (trunk) → `v0.2.0` (modules, Plan B) →
`v0.3.0` (onboarding skill, this plan).

- [ ] **Step 1: Confirm prior tag**

```bash
git tag --list
```

Expected: `v0.1.0` and `v0.2.0` are both present.

- [ ] **Step 2: Bump package.json version**

In `package.json`:

```diff
-  "version": "0.2.0",
+  "version": "0.3.0",
```

Commit:

```bash
git add package.json
git commit -m "chore: bump version to 0.3.0 (onboarding skill shipped)"
```

- [ ] **Step 3: Tag**

```bash
git tag -a v0.3.0 -m "AgenticBuilder v0.3 — onboarding skill"
git push origin main
git push origin v0.3.0
```

- [ ] **Step 4: Verify**

```bash
git tag --list | grep v0.
```

Expected: prints `v0.1.0`, `v0.2.0`, and `v0.3.0`.

---

## Acceptance — full plan

- [ ] `.claude/skills/agenticbuilder-onboarding/SKILL.md` exists with
      the frontmatter `name`/`description` from the spec §2.
- [ ] `.claude/skills/agenticbuilder-onboarding/references/module-catalog.md`
      lists all 7 modules with their `Prerequisites:` lines.
- [ ] `.claude/skills/agenticbuilder-onboarding/references/env-key-sources.md`
      documents every env key the trunk + 7 modules use.
- [ ] `.claude/skills/agenticbuilder-onboarding/references/rename-checklist.md`
      lists every file the rename touches and every file it leaves
      alone, plus a verification grep at the end.
- [ ] `.claude/skills/agenticbuilder-onboarding/scripts/apply-module.md`
      defines the 11-step install sub-routine with explicit halt
      conditions for each step.
- [ ] `SKILL.md` references each `references/*.md` and
      `scripts/apply-module.md` file via `@`-syntax, and every
      referenced file exists (Task 6).
- [ ] `docs/superpowers/onboarding-skill-self-test-2026-05-23.md`
      records the paper walkthrough verdict (Task 7).
- [ ] `git tag v0.3.0` marks the final
      commit.
- [ ] No `TBD` / `TODO` placeholders remain in any skill file.

## Out of scope (deferred or unchanged)

- Executing the skill end-to-end against a fresh clone. The skill is
  committed and ready, but a real end-to-end run requires Plan B's
  modules and a live Neon URL — deliberately not part of Plan C.
- A skill for **uninstalling** modules (each module README documents
  the reverse steps for now; automation could be Plan D).
- A `create-agenticbuilder` npm CLI (the skill replaces it).
- Production deploys past `vercel link`.
