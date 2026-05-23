# AgenticBuilder onboarding skill — design spec (Plan C)

**Date:** 2026-05-23
**Status:** Approved (spec → plan)
**Author:** Emile du Toit + Claude Opus 4.7
**Trunk spec:** `docs/superpowers/specs/2026-05-22-agenticbuilder-design.md` (§7 "Onboarding skill" is the canonical intent — this document is the detailed contract that turns §7 into something an engineer can build).
**Next step:** implementation plan at `docs/superpowers/plans/2026-05-23-agenticbuilder-onboarding-skill.md` (executed once Plan B has shipped the modules).

## 0. Summary

This spec defines the Claude Code skill at
`.claude/skills/agenticbuilder-onboarding/`. The skill replaces the
hypothetical `create-agenticbuilder` CLI: when a developer opens a fresh
AgenticBuilder clone in Claude Code, the skill walks them through the
seven onboarding steps (rename → owner email → DB → secret → module
selection → optional Vercel link → finalize), parses each chosen
module's README, and applies it deterministically. The skill is the only
piece of AgenticBuilder that "knows" the host project well enough to
mutate it on the developer's behalf — and it does so by following
verbatim instructions in module READMEs, not by running codemod scripts
(see trunk spec §3 and `modules/README.md`).

### Design pillars

- **Idempotent.** Re-running the skill after onboarding short-circuits to
  STEP 5 with already-installed modules filtered out of the catalog.
- **No magic.** Every mutation traces to a line in a module's README or
  in `references/rename-checklist.md`. The skill never invents diffs.
- **Secret-safe.** Secrets are pasted by the user into a tool the skill
  cannot read back (the `.env.local` file or the Vercel dashboard).
  The skill never echoes a secret back to the chat transcript.
- **Halts on failure.** Any step that fails (migration error, npm
  install non-zero exit, env validation throw) stops the flow and
  surfaces the error verbatim. The skill does not "try the next thing."

## 1. Skill location and layout

```
.claude/skills/agenticbuilder-onboarding/
├── SKILL.md                  ← entry point (frontmatter + 7-step flow)
├── references/
│   ├── module-catalog.md     ← snapshot of each module's "What this gives you" para
│   ├── env-key-sources.md    ← per-module: which dashboard/page to get keys from
│   └── rename-checklist.md   ← every file + line that mentions "agenticbuilder"
└── scripts/
    └── apply-module.md       ← reusable sub-routine: install one module by name
```

`SKILL.md` is the entry point Claude Code reads. The files under
`references/` and `scripts/` are loaded on-demand by the skill body
using `@.claude/skills/agenticbuilder-onboarding/references/<name>.md`
and `@.claude/skills/agenticbuilder-onboarding/scripts/<name>.md` file
references (the same syntax CLAUDE.md uses to alias to AGENTS.md). This
keeps the entry point short while making the per-module catalog and the
rename checklist easy to update without touching the flow.

## 2. Trigger conditions

`SKILL.md` frontmatter:

```yaml
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
```

Auto-discovery happens because the skill lives in `.claude/skills/`.
The description has two complementary triggers:

1. **Phrase match:** "set up", "onboard", "configure", "rename project",
   "install module".
2. **State match:** the absence of `.agenticbuilder-onboarded` at repo
   root AND `package.json#name === "agenticbuilder"`. This is what makes
   the skill greet the user on first open without being asked.

After onboarding the marker file is present, so the skill stays quiet
unless the user explicitly invokes it (typically "install module
<name>").

## 3. Flow (7 steps)

Each step in `SKILL.md` is written as a self-contained block with: a
detection condition, an explicit user prompt, the mutation it performs,
and what counts as success. Steps run sequentially; on failure the
skill stops and reports the error verbatim.

### STEP 1 — Detect state

**Detect.**
- Read `.agenticbuilder-onboarded` at repo root. If present, parse the
  recorded module list and jump to STEP 5 with the catalog filtered to
  "not yet installed".
- Read `package.json#name`. If it is not literally `"agenticbuilder"`,
  warn the user that this doesn't look like a fresh template clone and
  ask whether to continue anyway.

**Example dialogue (fresh clone):**

> I see this is a fresh AgenticBuilder clone (no `.agenticbuilder-onboarded`
> marker, package name is still "agenticbuilder"). I'll walk you through
> the seven onboarding steps. You can interrupt at any time — I'll stop
> on errors rather than barrelling ahead.
>
> Ready? (yes / skip step <N> / abort)

### STEP 2 — Project rename

**Prompt.**
- Ask: "What should the kebab-case project name be? (e.g.,
  `awesome-saas`)" — used in `package.json#name`, `vercel.json`,
  `.env.example` header.
- Ask: "What should the human-readable Title Case name be? (e.g.,
  `Awesome SaaS`)" — used in `README.md` H1 and metadata.

**Mutate.** For every file/line in
`@references/rename-checklist.md`, apply the substitution. Each entry
in the checklist is `path:line` or `path:section` — the skill reads the
file, performs the rename, and writes it back. The checklist's exact
contents are listed in §6 below.

**Optional.** Offer `git init && git add -A && git commit -m "chore:
initial commit from agenticbuilder template"`. If the repo was cloned
without `.git/` (e.g., the user ran `rm -rf .git && git init` already),
just stage and commit.

**Example dialogue:**

> Two names: a kebab-case slug (for `package.json` / `vercel.json`) and
> a Title Case name (for `README.md`).
>
> kebab-case name: _ (default: directory name, lowercased and hyphenated)
> Title Case name: _

Success criterion: every file in the rename checklist no longer
contains the literal string `agenticbuilder` (case-insensitive),
EXCEPT for files under `modules/`, `.claude/skills/`, and
`docs/superpowers/specs|plans/` (those keep their historic name to
preserve the audit trail).

### STEP 3 — Owner email

**Prompt.** "What's your OWNER_EMAIL? (default: `$(git config user.email)`)"

**Mutate.** Append to `.env.local`:

```
OWNER_EMAIL="user@example.com"
```

**Pre-flight.** Verify `OWNER_EMAIL` is in the zod schema in
`src/lib/env.ts` (trunk ships with it; this is a guard against drift if
the user has hand-edited the schema). If it's missing, stop and ask the
user to restore the trunk env schema.

### STEP 4 — Database + auth secret

**Sub-step 4a — `DATABASE_URL`.** Ask:

> How do you want to set up your Postgres database?
>
> 1. **Paste an existing Neon URL.** I'll write it straight to .env.local.
> 2. **Create a new Neon project.** Open https://console.neon.tech in
>    your browser, create a project, copy the pooled connection string,
>    then paste it here.
> 3. **Provision via Vercel Marketplace.** I'll run `vercel link`,
>    `vercel marketplace add neon`, then `vercel env pull .env.local`.
>    This requires that the Vercel CLI is installed and authenticated.

For option 3 the skill runs these commands in order, stopping on any
non-zero exit:

```bash
vercel link
vercel marketplace add neon
vercel env pull .env.local
```

**Sub-step 4b — `BETTER_AUTH_SECRET`.** Generate via:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The skill captures stdout, appends `BETTER_AUTH_SECRET="<hex>"` to
`.env.local`, and **must not** print the hex to the chat transcript.

**Sub-step 4c — `BETTER_AUTH_URL`.** Write
`BETTER_AUTH_URL="http://localhost:3000"` to `.env.local` (the value
the trunk's zod schema requires for dev).

**Sub-step 4d — Install + migrate.**

```bash
test -d node_modules || npm install
npm run db:generate
npm run db:migrate
```

If `db:migrate` fails (connection error, schema error), stop and surface
the stderr verbatim — do not proceed to STEP 5.

**Sub-step 4e — Verify sign-up.** The skill prompts:

> I'll start the dev server now. In a browser, please:
>
> 1. Open http://localhost:3000
> 2. Click Get started, sign up with a test account.
> 3. Confirm you land on /dashboard.
> 4. Stop the dev server (Ctrl+C in this terminal) and reply "verified"
>    or "failed: <what went wrong>".

The skill runs `npm run dev` in the foreground until the user replies.
On "failed", it stops; on "verified", it proceeds to STEP 5.

### STEP 5 — Module selection

**Show catalog.** Print
`@references/module-catalog.md` as a numbered checklist.

**Filter.** If `.agenticbuilder-onboarded` already records installed
modules, omit them from the list and label the section "Add more
modules" instead of "Choose modules".

**Prompt.**

> Pick any subset by number (e.g., `1, 3, 6`) or `none`. The skill will
> install them in dependency order (admin-scaffold after role-gates).

**Per-module loop.** For each chosen module, in dependency order
(topological sort using each module's `Prerequisites` section), the
skill dispatches to `@scripts/apply-module.md` with the module name as
the argument. `apply-module.md` is the canonical sub-routine — it owns
the 8 install sub-steps detailed in trunk spec §7 STEP 5. The flow is:

1. Read `modules/<name>/README.md` and parse the H2 sections.
2. Append `modules/<name>/env.example` to `.env.local` with empty
   placeholders for each key.
3. For each env key, look it up in
   `@references/env-key-sources.md` and walk the user through obtaining
   it. The user pastes each value; the skill writes it to `.env.local`
   without echoing it back.
4. **Update `src/lib/env.ts` FIRST** — apply the zod schema diff from
   the README. This is the anti-pattern guard ("env writes through
   env.ts first"). Run `npm run typecheck` to confirm.
5. Merge `modules/<name>/deps.json` into `package.json`, then
   `npm install`.
6. Copy `modules/<name>/src/*` → `src/` (apply each path verbatim from
   the README's `## Install` section).
7. Apply the schema diff. If `modules/<name>/migrations/` is non-empty
   OR the schema diff produced changes, run:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
8. Apply any "Wire into existing file" diffs from the README.
9. Run the module's `## Verify` step interactively (browser-based, the
   same shape as STEP 4e).

If any sub-step fails, the skill stops, records the partial state, and
reports which sub-step failed.

### STEP 6 — Vercel link (optional)

**Prompt.**

> Do you want to link this repo to a Vercel project now? (yes / later)
>
> If yes: I'll run `vercel link`. Then I can offer to add non-secret env
> vars (BETTER_AUTH_URL, OWNER_EMAIL) via `vercel env add`. Secrets
> (DATABASE_URL, BETTER_AUTH_SECRET, any module secrets) you'll paste
> into the Vercel dashboard directly — I never type secrets.

If yes, run:

```bash
vercel link
```

Then for each non-secret env key in `.env.local`, ask whether to push
it to Vercel via `vercel env add <KEY> production` (the skill pipes the
value via stdin so it never appears in the chat transcript).

For secret env keys, print a list and instruct:

> Paste each of these into https://vercel.com/<your-team>/<project>/settings/environment-variables :
> - DATABASE_URL
> - BETTER_AUTH_SECRET
> - <module-secret-keys>

### STEP 7 — Finalize

**Write marker.** Create `.agenticbuilder-onboarded` at repo root:

```
# AgenticBuilder onboarding marker — do not delete.
# Touching this file disables the onboarding skill's auto-greet on next open.
onboarded_at: 2026-05-23T14:32:11Z
project_name: awesome-saas
project_title: Awesome SaaS
installed_modules:
  - role-gates
  - admin-scaffold
```

**Confirm-delete seeds.** Ask:

> The brainstorm handoff doc at `docs/brainstorm-handoff-2026-05-22.md`
> is template-author scratch and irrelevant to your project. Delete it?
> (yes / no — type "yes" to confirm)

Only delete on explicit `yes`. Never invoke `rm -rf` without explicit
confirmation (anti-pattern guard).

**Keep the skill.** Do not remove `.claude/skills/agenticbuilder-onboarding/`
— the user may add more modules later, and the skill re-enters at STEP 5.

**Suggest commit.** Print:

```bash
git add -A
git commit -m "chore: complete onboarding (renamed, env set up, installed: <modules>)"
```

**Print summary.**

> Onboarding complete.
>
> Project: <Title Case Name> (<kebab-case-slug>)
> Modules installed: <list, or "none">
> Next: `npm run dev` and open http://localhost:3000
>
> To add more modules later, just say "install module <name>" — the
> skill will re-enter at the module selection step.

## 4. Anti-patterns (baked into `SKILL.md`)

These appear at the top of `SKILL.md` under a `## Anti-patterns` section
and are referenced from each relevant step.

1. **Never echo a secret.** The skill writes secrets to `.env.local` or
   pipes them via stdin to `vercel env add`. It never includes the
   secret value in a chat response, code-block excerpt, or status
   message. (Applies to BETTER_AUTH_SECRET, DATABASE_URL, module
   secrets.)
2. **Never run destructive ops without explicit confirmation.** `rm`,
   `git reset --hard`, `git clean -fd`, and any non-undo-able operation
   require the user to type the literal word `yes` in response to a
   one-line preview of what will be deleted. "Sure" / "ok" / "go ahead"
   do not count.
3. **Halt on failure.** Any non-zero exit code from `npm`, `vercel`,
   `node`, or `drizzle-kit` stops the flow. The skill prints the
   stderr verbatim and asks the user what to do — it does not retry,
   skip, or work around.
4. **Env writes go through `src/lib/env.ts` first.** When a module
   adds an env key, the skill applies the zod-schema diff in
   `src/lib/env.ts` before writing the value into `.env.local`. This
   guarantees that the next `npm run dev` either succeeds with all
   required keys present or fails with a zod error pointing at the
   exact missing key — never silently with `process.env.X === undefined`.
5. **Module mutations come from the README, not from the skill.** If a
   step in `modules/<name>/README.md` says "Add this line to
   `src/proxy.ts`", the skill applies that diff verbatim. If the
   README is wrong, the fix is in the README — not in the skill.

## 5. Re-entrance

`.agenticbuilder-onboarded` is the durable record of onboarding state.

- **On startup**, the skill reads the marker. If it exists:
  - STEP 1 detects "already onboarded" and asks: "Looks like you're
    already set up. Add more modules?"
  - On yes, jump to STEP 5 with the catalog filtered to modules NOT in
    `installed_modules:`.
  - On no, exit quietly — do not re-run the rename or env-setup steps.
- **After STEP 5 in a re-entrant run**, STEP 6 is skipped (Vercel link
  is a once-per-project decision) and STEP 7 only updates
  `installed_modules:` in the marker file. The full summary is reprinted.

If the user actually wants to re-run rename or env setup, they pass
`--force` (the skill prompts a confirmation): "Re-running onboarding
from scratch will overwrite your project name and re-prompt for all env
vars. Are you sure? (type 'yes' to confirm)".

## 6. References (`references/*.md`)

### 6.1 `references/module-catalog.md`

A flat snapshot of each module's `## What this gives you` paragraph,
keyed by module slug, with the dependency edge from `modules/README.md`
preserved.

Structure:

```markdown
# Module catalog

Snapshot of `modules/*/README.md` "What this gives you" + "Prerequisites".
Regenerate with `scripts/regen-module-catalog.sh` after editing any
module README. (No automation here yet — it's a hand-maintained copy
for now; drift is caught by the self-test in Plan C Task 7.)

## stripe — no prerequisites
<one paragraph copied verbatim from modules/stripe/README.md>

## ai-sdk — no prerequisites
<one paragraph from modules/ai-sdk/README.md>

## blob — no prerequisites
<one paragraph from modules/blob/README.md>

## email-resend — no prerequisites
<one paragraph from modules/email-resend/README.md>

## vitest — no prerequisites
<one paragraph from modules/vitest/README.md>

## role-gates — no prerequisites
<one paragraph from modules/role-gates/README.md>

## admin-scaffold — requires: role-gates
<one paragraph from modules/admin-scaffold/README.md>
```

The skill reads this file to render the STEP 5 checklist. Each module's
`Prerequisites` line is what powers the topological sort.

### 6.2 `references/env-key-sources.md`

For each env key in each module's `env.example`, where to obtain it.
Keyed by `MODULE.KEY`, with the dashboard URL and the exact name the
user should look for.

Structure:

```markdown
# Env key sources

For each env key, the dashboard/page where it lives and the exact name
to look for. The skill walks the user here in STEP 5 sub-step 3.

## stripe

### STRIPE_SECRET_KEY
- URL: https://dashboard.stripe.com/apikeys
- Look for: "Secret key" (sk_test_… in test mode, sk_live_… in live).
- Notes: test keys for local dev, live keys ONLY for production.

### STRIPE_WEBHOOK_SECRET
- URL: https://dashboard.stripe.com/webhooks
- Look for: "Signing secret" on the webhook endpoint you've created
  pointing at `<your-domain>/api/stripe/webhook`. Starts with `whsec_`.

## ai-sdk

### AI_GATEWAY_API_KEY
- URL: https://vercel.com/dashboard/ai (your AI Gateway in Vercel).
- Look for: "API Key" button → "Copy". Starts with `vck_`.

## blob

### BLOB_READ_WRITE_TOKEN
- URL: https://vercel.com/<team>/<project>/stores
- Look for: create a Blob store; the token appears under the store's
  "Quickstart" tab. Starts with `vercel_blob_rw_…`.

## email-resend

### RESEND_API_KEY
- URL: https://resend.com/api-keys
- Look for: "Create API key" → name it for this project. Starts with `re_`.

## vitest
No env keys.

## role-gates
No env keys (uses OWNER_EMAIL from the trunk).

## admin-scaffold
No env keys (inherits from role-gates).
```

### 6.3 `references/rename-checklist.md`

Every file/line that contains the literal string `agenticbuilder` (case
sensitive AND insensitive), broken into "must rename" and "preserve"
categories.

Structure:

```markdown
# Rename checklist

The skill applies these substitutions in STEP 2.

## Substitution rules

- `agenticbuilder`   → `<kebab-case-slug>`        (lowercase code paths)
- `AgenticBuilder`   → `<Title Case Name>`        (display strings)
- `Agentic Builder`  → `<Title Case Name>`        (rare; only README intro line)

## Files to rewrite

| Path                                  | Lines / sections to touch                              |
|---------------------------------------|--------------------------------------------------------|
| `package.json`                        | `"name"` field                                         |
| `README.md`                           | H1 line; first prose paragraph                         |
| `.env.example`                        | header comment line (top of file)                      |
| `vercel.json`                         | none unless a `"name"` key is present (it isn't in trunk; check) |
| `src/app/layout.tsx`                  | `metadata.title`, `metadata.description`               |
| `src/app/page.tsx`                    | H1 text                                                |
| `src/app/(app)/_components/Navbar.tsx`| brand link text ("AgenticBuilder")                     |

## Files to LEAVE ALONE

These keep the historic "agenticbuilder" name on purpose. Skipping them
preserves the audit trail and the skill's own references.

- `AGENTS.md` — references "AgenticBuilder" the project family (the
  manual itself doesn't get renamed; the project just inherits it).
- `modules/README.md`, `modules/*/README.md` — module docs reference
  the template family by name.
- `docs/superpowers/specs/*.md`, `docs/superpowers/plans/*.md` — design
  history; do not rewrite.
- `.claude/skills/agenticbuilder-onboarding/**` — the skill itself.
- `.github/template-cleanup.yml` — references the seed files by name;
  the cleanup action removes itself anyway.
- `src/app/(app)/notes/README.md` — internal reference doc.
```

## 7. `scripts/apply-module.md`

The reusable sub-routine STEP 5 dispatches to. It parses
`modules/<name>/README.md`, applies the 9 sub-steps from §3 STEP 5
above, and emits a structured pass/fail at the end so STEP 5 can
proceed or halt.

Structure:

```markdown
# apply-module — install one module by name

**Inputs:**
- `<module-name>` (the directory under modules/, e.g., `stripe`)

**Sub-routine:**

1. **Resolve.** Confirm `modules/<name>/README.md` exists and has the
   five required H2 sections (`What this gives you`, `Prerequisites`,
   `Environment variables`, `Install`, `Verify`, `Uninstall`). If any
   is missing, halt with "module README malformed".

2. **Prerequisites.** Parse the `## Prerequisites` bullet list. For
   each "<other-module>" entry, confirm `.agenticbuilder-onboarded`
   records it as installed. If not, halt and recommend installing the
   prerequisite first.

3. **Env example.** Append the contents of `modules/<name>/env.example`
   to `.env.local`, with each value replaced by an empty string. (The
   user supplies values in step 4.)

4. **Walk env keys.** For each key from `modules/<name>/env.example`,
   look it up in `references/env-key-sources.md`. Print the URL +
   "look for". Prompt the user to paste the value. Write it to
   `.env.local` without echoing. If a key is `Required: yes` in the
   module README's env table and the user pastes empty, halt.

5. **Env schema diff.** Apply the verbatim diff from the module
   README's `## Install` step 3 ("Add to src/lib/env.ts") to
   `src/lib/env.ts`. Run `npm run typecheck`. Halt on failure.

6. **Deps.** Merge `modules/<name>/deps.json` into `package.json` and
   run `npm install`. Halt on non-zero exit.

7. **Copy src/.** For each `src/...` path listed in the README's
   `## Install` step 2, copy `modules/<name>/src/<src-path>` → that
   destination. Refuse to overwrite an existing file unless the README
   explicitly says "replace" — in which case prompt for confirmation.

8. **Schema diff + migrate.** Apply the diff from `## Install` step 4
   to `src/lib/db/schema.ts`. If `modules/<name>/migrations/` is
   non-empty, copy each `.sql` file into `drizzle/migrations/` (with a
   numeric prefix that keeps order). Run `npm run db:generate` and
   `npm run db:migrate`. Halt on either failure.

9. **Wire diffs.** Apply each "Wire into existing file" diff from
   `## Install` step 6.

10. **Verify.** Print the module's `## Verify` section verbatim and
    wait for the user to reply "verified" or "failed: <reason>". Halt
    on failed.

11. **Record.** Append the module name to `installed_modules:` in
    `.agenticbuilder-onboarded` (or queue it for STEP 7 to write if
    that file doesn't exist yet).

**Output:** "module <name> installed" on success; halt with a one-line
reason on any failure (the calling STEP 5 will surface the error).
```

## 8. Acceptance criteria

The skill is shippable when:

- [ ] `.claude/skills/agenticbuilder-onboarding/SKILL.md` exists with
      frontmatter that triggers on the conditions in §2.
- [ ] The three `references/*.md` files exist and contain the content
      described in §6.
- [ ] `scripts/apply-module.md` exists and contains the sub-routine
      described in §7.
- [ ] A dry-run walkthrough of a fresh clone (executed by hand against
      the checklist in Plan C Task 7) covers all seven steps without
      hitting an undefined branch.
- [ ] On a fresh clone after running the skill end-to-end:
  - `package.json#name`, `README.md` H1, and the other rename-checklist
    files reflect the new project name.
  - `.env.local` exists with `DATABASE_URL`, `BETTER_AUTH_SECRET`,
    `BETTER_AUTH_URL`, `OWNER_EMAIL`, plus any module-specific keys.
  - `npm run db:migrate` has been run; `npm run dev` works; `/signup`
    creates a real account.
  - `.agenticbuilder-onboarded` exists with `onboarded_at`,
    `project_name`, `project_title`, `installed_modules`.
  - `docs/brainstorm-handoff-*.md` is gone (if the user said yes).
- [ ] Re-running the skill after onboarding short-circuits to STEP 5
      with already-installed modules filtered out.
- [ ] No secret value appears in the chat transcript at any point in the
      flow.
- [ ] All anti-patterns in §4 are explicitly referenced from the steps
      they apply to in `SKILL.md`.

## 9. Out of scope

- Replacing user-scope skills with repo-scope copies (the trunk spec
  §9 already calls this out — the skill stays in
  `.claude/skills/` and is committed with the repo).
- A `create-agenticbuilder` npm CLI (the whole point of this skill is
  to avoid one).
- Uninstalling modules (the `Uninstall` section of each module README
  documents the reverse steps; the skill does not currently automate
  uninstall — could be a future Plan D).
- Production deploys past `vercel link`. The skill doesn't run
  `vercel deploy` — that's a separate decision the user makes after
  confirming everything works locally.
- Multi-tenancy / org switching (trunk is single-tenant per user).
- Background jobs / cron setup (deferred per trunk spec §9).

## 10. Dependencies

- **Plan B (modules).** This skill walks users through installing
  modules from `modules/<name>/`. Plan C's implementation plan can be
  written and committed before Plan B ships, but the skill's STEP 5
  cannot be exercised end-to-end until each module's README + src +
  env.example + deps.json + migrations are in place. Plan C Task 7
  (self-test) verifies the skill against whatever modules exist at the
  time of execution; modules added later are picked up automatically
  because the catalog is regenerated.

- **Trunk (Plan A, v0.1.0, shipped).** The skill depends on the
  files/conventions established in the trunk: `package.json#name`,
  `src/lib/env.ts` zod schema, `modules/README.md` parse contract,
  `.env.example` shape, `vercel.json`. Any divergence from trunk
  silently breaks STEP 2 / STEP 4 — the rename checklist and the
  env-schema diff machinery both assume the trunk's exact file shape.
