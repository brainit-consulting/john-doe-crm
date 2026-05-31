---
name: agenticbuilder-onboarding
description: >-
  Jumpstart a new AgenticBuilder SaaS project end-to-end: scaffold from
  the template (if needed), rename the project, set up the database and
  auth secret, choose opt-in modules from modules/, link Vercel, and
  write the .agenticbuilder-onboarded marker. Use whenever the user
  says "create an agenticbuilder app", "scaffold agenticbuilder", "new
  saas", "set up", "onboard", "configure", "rename project", "install
  module", or whenever the .agenticbuilder-onboarded marker file is
  ABSENT at the repo root and the package.json name is still
  "agenticbuilder".
---

# AgenticBuilder onboarding

You are jumpstarting a new AgenticBuilder SaaS project. Depending on
where you were invoked, either scaffold a fresh repo from the template
(STEP 0) or operate on an already-cloned working tree (STEP 1+). Walk
the developer through the flow below. Stop on any failure; never echo
a secret value back to the chat; never run destructive ops without
explicit confirmation.

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

## STEP 0 — Bootstrap (skip if already inside an agenticbuilder clone)

Determine whether you're already inside an agenticbuilder working tree:

```bash
test -f .agenticbuilder-onboarded \
  || ( test -f package.json && node -e "process.exit(require('./package.json').name === 'agenticbuilder' ? 0 : 1)" )
```

- **Exit code 0 (already inside an agenticbuilder repo, fresh or partially
  onboarded):** skip STEP 0 entirely and go to STEP 1.
- **Exit code 1 (empty dir, or a non-agenticbuilder project):** continue
  with STEP 0 below.

Greet:
> "I don't see an agenticbuilder project here. Want me to create a new
> one from the template? (yes/skip — say `skip` if you meant to run
> this somewhere else)"

On anything other than `yes`, exit quietly.

On `yes`, verify the GitHub CLI is installed and authenticated:

```bash
gh --version && gh auth status
```

- If `gh --version` fails: tell the user `Install the GitHub CLI:
  https://cli.github.com/`, then halt.
- If `gh auth status` fails: tell the user `Run 'gh auth login', then
  re-trigger me`, then halt.

Ask for three values, one at a time:

1. **GitHub repo name** (kebab-case, also used as the local directory
   name; suggest the cwd's basename if it looks reasonable).
2. **Owner** — your personal `gh` user (default), or a GitHub
   organization you're a member of. Run `gh api user --jq .login` for
   the default.
3. **Visibility** — `private` (default) or `public`.

Confirm the plan in one line before acting:
> "Will create `<owner>/<name>` (<visibility>) from
> `brainit-consulting/agenticbuilder` and clone it into `./<name>`.
> Proceed? (yes/no)"

Only on literal `yes`, run:

```bash
gh repo create <owner>/<name> \
  --template brainit-consulting/agenticbuilder \
  --<visibility> \
  --clone
cd ./<name>
```

If `gh repo create` fails (name taken, no template access, etc.), halt
and surface stderr verbatim. Do not retry with a mangled name.

After `cd`, fall through to STEP 1. STEP 1 will detect a fresh clone
(no marker, `package.json#name == "agenticbuilder"`) and proceed
straight to STEP 2.

## STEP 1 — Detect state

Read `.agenticbuilder-onboarded` at the repo root.

- **If present:** check first whether this is the canonical
  template-author marker that ships with the trunk repo (`brainit-
  consulting/agenticbuilder` keeps one at root so CI workflows gated on
  `hashFiles('.agenticbuilder-onboarded') != ''` run on every push to
  the template). Detect it by the absence of a `progress:` block — real
  onboarding-skill markers always include `progress:` (STEP 7 writes
  it). If the marker has no `progress:` field, treat it as if no marker
  exists and fall through to the "If absent" branch below.

  Otherwise (real marker with a `progress:` block), parse `progress:`
  and `installed_modules:`:
  - If every step under `progress:` is `done`: onboarding is complete.
    Greet:
    > "You're already onboarded. Want to add more modules?"
    On `yes`, skip to STEP 5 with the catalog filtered to NOT-installed
    modules. On `no`, exit quietly.
  - If any step is `in-progress` or `pending`: a previous run was
    interrupted. Greet:
    > "Onboarding is partially complete. Resume from STEP <N>? (yes/no)"
    On `yes`, jump to the first non-`done` step and continue from there
    (preserving the already-recorded `project_name`, `project_title`,
    etc.). On `no`, exit quietly.
  - Check for natural-language `--force` (see Re-entrance section
    below); if detected, confirm and restart from STEP 2.

- **If absent (or template-author marker detected above):** check
  `package.json#name`.
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

**After applying renames, run the verification grep** from
`references/rename-checklist.md`:

```bash
grep -rEli "agenticbuilder([^-]|$)" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude-dir=modules \
  --exclude-dir=.claude \
  --exclude-dir=superpowers \
  .
```

Two non-obvious bits in that grep, both intentional:

- `--exclude-dir` matches by directory **basename**, not path. That's
  why we exclude all of `.claude` and the dir named `superpowers` —
  path-style values like `.claude/skills` or `docs/superpowers` never
  match.
- `agenticbuilder([^-]|$)` (POSIX extended regex) matches the project
  name only when it is followed by a non-dash character or end-of-line
  — skipping the whole `agenticbuilder-*` family
  (`agenticbuilder-onboarding`, `agenticbuilder-modules`, etc.), which
  are intentional references that survive the rename. The POSIX form
  is portable; the equivalent PCRE `agenticbuilder(?!-)` would need
  `LC_ALL=C.UTF-8 grep -P` on some Git-Bash installs.

Expected: zero matches, or only files in the LEAVE ALONE list. If
anything else prints, **halt** and report the list of stragglers — do
not blind-rewrite them; the checklist needs updating first.

Offer:
> "Want me to `git init && git add -A && git commit -m 'chore: initial
> commit from agenticbuilder template'`? (yes/no)"

Only run on `yes`.

**Success criterion:** the verification grep above is clean (zero
matches outside the LEAVE ALONE list).

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

**Pre-flight (only if user picks choice 2 or 3):** Before walking the
user through Neon project creation, check whether they're near Neon's
project limit. Run via the Neon MCP plugin:

```
mcp__plugin_neon_neon__list_projects  (no args)
```

(The Neon MCP plugin auth flow is documented in the user's memory at
`reference_neon_mcp_plugin.md`. If the plugin isn't authenticated yet,
the tool returns an OAuth URL — hand it to the user and resume after.)

If `projects.length >= 9` (Neon Hobby allows 10 per org), tell the user:

> "You have N Neon projects already (Hobby plan limit is 10). Creating
> a new one may hit the limit and return a 404. Alternatives:
>   a) Use a branch on an existing Neon project (free, fast)
>   b) Delete an unused project first
>   c) Upgrade Neon plan
> Want me to (a) create a branch on an existing project for you?"

If yes, offer the project list and let the user pick. Then run
`mcp__plugin_neon_neon__create_branch` with the project's id and a
branch name (e.g., `<projectname>-main`). Use the resulting branch's
connection string (via `mcp__plugin_neon_neon__get_connection_string`,
passing `branchId` explicitly) as the project's DATABASE_URL.

Then proceed to the original choices for users not near the limit.

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

Classify every key in `.env.local` into secret vs non-secret using the
lists below. Push non-secrets via the CLI; instruct the user to paste
secrets into the dashboard.

**Secret keys (do NOT push via `vercel env add`; user pastes in dashboard):**

- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `AI_GATEWAY_API_KEY`,
  `BLOB_READ_WRITE_TOKEN`, any key matching `*_SECRET` or `*_TOKEN` or
  `*_KEY` (except `NEXT_PUBLIC_*_KEY`, which is public by Next's
  convention).

**Non-secret keys (safe to push via `echo "<value>" | vercel env add <KEY> production`):**

- `BETTER_AUTH_URL`, `OWNER_EMAIL`, `EMAIL_FROM`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_PRO`,
  `STRIPE_PRICE_TEAM`, any `NEXT_PUBLIC_*` key.

For each NON-secret key found, ask the user whether to push it, then:

```bash
echo "<value>" | vercel env add <KEY> production
```

For SECRET keys, print the list and instruct the user to paste them
into the Vercel dashboard directly:

> "Paste these into https://vercel.com/<team>/<project>/settings/environment-variables :
>  - DATABASE_URL
>  - BETTER_AUTH_SECRET
>  - <module secrets>"

(In a re-entrant run reaching STEP 5 from the marker, skip STEP 6.)

## STEP 7 — Finalize

Write `.agenticbuilder-onboarded` at repo root:

```yaml
# AgenticBuilder onboarding marker — do not delete.
# Touching this file disables the onboarding skill's auto-greet on next open.
onboarded_at: <ISO 8601 UTC timestamp>
project_name: <kebab-case slug>
project_title: <Title Case name>
progress:
  step-2-rename: done
  step-3-owner-email: done
  step-4-database: done
  step-5-modules: done
  step-6-vercel: done
  step-7-finalize: done
installed_modules:
  - <module-1>
  - <module-2>
```

The `progress:` map is **append-as-you-go**: each step writes its key
on success so a crash/abort mid-flow leaves a partial marker that the
next invocation can resume from (see Re-entrance below). Use values
`done` | `in-progress` | `pending` | `skipped`.

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

### Resume from partial

Each step updates the `progress:` map in the marker as it completes:

- On entry to STEP N, set `step-N-<name>: in-progress` and write.
- On successful exit from STEP N, set `step-N-<name>: done` and write.
- If a step is skipped (e.g., STEP 6 declined), write `skipped`.

If the skill is invoked again before all steps are `done`, STEP 1
detects the partial marker and offers to resume from the first
non-`done` step. The user can decline (e.g., to start fresh via
`--force`).

### `--force` re-run (NL detection)

Claude Code skills don't accept argv, so `--force` is a natural-language
signal. Treat any of the following user phrases as `--force`:

- "re-run from scratch"
- "force re-run" / "force rerun"
- "start over"
- "redo onboarding"
- "wipe and restart"
- "rerun onboarding from scratch"
- "I want to start the onboarding fresh"

On detection, reply:

> "Re-running from scratch will overwrite your project name and
> re-prompt for all env vars. Are you sure? (type 'yes')"

Only on literal `yes`: rename the marker to
`.agenticbuilder-onboarded.bak.<timestamp>`, then proceed to STEP 2 as
if this were a fresh clone.
