# Onboarding skill self-test — 2026-05-23

Plan C Task 7. Paper walkthrough of the `agenticbuilder-onboarding` skill
(`SKILL.md` + 3 references + `scripts/apply-module.md`) against a
hypothetical fresh clone of AgenticBuilder at commit `56078f6`.

This report does **not** execute the skill — running it would mutate the
canonical trunk (rename, install modules, write env files). Instead, it
walks the skill step-by-step on paper, checks that every input it expects
exists in the current trunk and every output is well-defined, and flags
any place where the skill's instructions would break in practice.

Hypothetical user throughout: `Dev` who runs
`git clone https://github.com/dutoit-emile/agenticbuilder ~/projects/MyNewSaaS && cd ~/projects/MyNewSaaS`
and opens Claude Code.

---

## Skill invocation premise

The skill's frontmatter (`SKILL.md` lines 1–11) auto-triggers when:
- the user says "set up" / "onboard" / "configure" / "rename project" /
  "install module", OR
- `.agenticbuilder-onboarded` is ABSENT at the repo root AND
  `package.json#name == "agenticbuilder"`.

Trunk state confirmed:
- `.agenticbuilder-onboarded` → ABSENT (verified via `test -f`).
- `package.json#name` → `"agenticbuilder"` (verified via `grep`).

Both auto-trigger conditions are met. Dev opens Claude Code; the skill
loads. PASS.

---

## Results table

| Step | Verdict | Notes |
|------|---------|-------|
| 1 — Detect state | PASS | Marker absent; package name matches; proceeds to STEP 2. |
| 2 — Project rename | PASS | All 14 "rewrite" files exist; all 11 "leave-alone" entries exist; rename loop well-defined. |
| 3 — Owner email | PASS | `OWNER_EMAIL` is in `src/lib/env.ts:9` and `.env.example:12`. |
| 4 — DB + secret | PASS | `node`, `npm`, `vercel` CLIs all on PATH; `db:generate`, `db:migrate`, `dev` scripts present. |
| 5 — Module selection | PASS-WITH-ISSUES | Catalog parses; all 7 module dirs present (Plan B shipped). Two real issues found — see §"Open issues". |
| 6 — Vercel link | PASS | `vercel` CLI is on PATH; flow well-defined. |
| 7 — Finalize | PASS | Marker shape defined; `docs/brainstorm-handoff-2026-05-22.md` is present, so delete prompt fires. |
| Re-entrance | PASS | `SKILL.md:46–49` and `SKILL.md:237–250` define the marker-detect-and-jump-to-STEP-5 path. |
| `--force` | PASS | `SKILL.md:248–250` defines the `yes`-confirm prompt. |
| Failure handling | PASS | Anti-pattern §3 enforces halt-on-error; apply-module.md §"Failure-mode summary" enumerates per-step halts. |
| Secret safety | PASS | Anti-pattern §1 + apply-module.md step 4 sub-step 5 both forbid echoing secrets. |
| Anti-patterns coverage | PASS | All 4 anti-patterns from spec §5 honored (see §"Anti-patterns verification"). |

---

## STEP 1 — Detect state

**What the skill reads:** `.agenticbuilder-onboarded` at repo root; then
`package.json#name`.

**What the skill concludes on a fresh clone:**
- `test -f .agenticbuilder-onboarded` → false → marker absent.
- `package.json#name` → `"agenticbuilder"` → matches the template.
- Decision: proceed to STEP 2.

**Verdict:** PASS. The decision tree in `SKILL.md:44–54` is unambiguous
and the inputs all exist as expected.

---

## STEP 2 — Project rename

Hypothetical exchange:

```
Skill: What kebab-case slug do you want for this project? (suggest: my-new-saas)
Dev:   my-new-saas
Skill: What Title Case display name?
Dev:   MyNewSaaS
```

The skill reads `@references/rename-checklist.md` and walks the 14 entries
under "Files to rewrite". Confirmed each exists in the trunk:

```
OK  package.json
OK  README.md
OK  .env.example
OK  vercel.json
OK  src/app/layout.tsx
OK  src/app/page.tsx
OK  src/app/(app)/_components/Navbar.tsx
OK  src/app/(app)/_components/FileUpload.tsx
OK  src/app/api/chat/route.ts
OK  src/lib/blob.ts
OK  src/lib/email/templates/welcome.ts
OK  src/lib/email/templates/verify.ts
OK  src/lib/email/templates/password-reset.ts
OK  e2e/auth.spec.ts
```

All 11 "Files to LEAVE ALONE" entries also exist:

```
OK  AGENTS.md
OK  modules/README.md
OK  modules/*/src/** and modules/*/env.example  (directory check — all 7 present)
OK  modules/vitest/e2e/auth.spec.ts
OK  docs/superpowers/specs and docs/superpowers/plans (dirs)
OK  docs/brainstorm-handoff-2026-05-22.md
OK  .claude/skills/agenticbuilder-onboarding/**
OK  .github/template-cleanup.yml
OK  src/app/(app)/notes/README.md
OK  package-lock.json
OK  CLAUDE.md
OK  .env.local  (skill never touches this for rename)
```

After the rewrites, the skill runs the verification grep at
`rename-checklist.md:88–89`. The exclude pattern correctly covers all
"leave alone" paths.

**Verdict:** PASS. The skill then offers
`git init && git add -A && git commit -m '…'` and only runs on literal
`yes`, honoring anti-pattern §2.

---

## STEP 3 — Owner email

Trunk verified:
- `src/lib/env.ts:9` — `OWNER_EMAIL: z.string().email("OWNER_EMAIL must be a valid email"),`
- `.env.example:12` — `OWNER_EMAIL=""`

Hypothetical exchange:

```
Skill: What's your OWNER_EMAIL? (default: dutoit.emile@gmail.com from git config)
Dev:   <enter to accept>
```

Skill copies `.env.example` → `.env.local` (file doesn't exist on fresh
clone), then appends `OWNER_EMAIL="dutoit.emile@gmail.com"`.

**Verdict:** PASS. Note: the skill writes the email plaintext to
`.env.local` but does NOT echo it back in the chat — consistent with
anti-pattern §1 (treating any user-supplied env value as a potential
secret).

---

## STEP 4 — Database + auth secret

CLI availability verified:
- `node` → `/c/Program Files/nodejs/node`
- `npm`  → `/c/Program Files/nodejs/npm`
- `vercel` → `/c/Users/snake/AppData/Roaming/npm/vercel`

package.json scripts verified:
- `db:generate` → `drizzle-kit generate`
- `db:migrate`  → `drizzle-kit migrate`
- `dev`         → `next dev`
- `typecheck`   → `tsc --noEmit` (needed by apply-module step 5)

**Walked the Vercel Marketplace path (SKILL.md:106–112):**

1. Skill prompts the three choices; Dev picks `3`.
2. Skill runs `vercel link` — if Dev is not authed, Vercel prompts the
   login flow in the user's browser. Skill waits for completion. (Halt
   on any non-zero exit per anti-pattern §3.)
3. Skill runs `vercel marketplace add neon` — provisions a Neon project
   under Dev's Vercel account and writes `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED`, `PGHOST`, etc. into the Vercel project's
   environment.
4. Skill runs `vercel env pull .env.local` — downloads those keys plus
   any others Dev's Vercel project has to `.env.local`. **Skill does
   not read the values back to the chat** (anti-pattern §1).

**Walked BETTER_AUTH_SECRET generation (SKILL.md:120–127):**

Skill runs `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
captures stdout, appends `BETTER_AUTH_SECRET="<hex>"` to `.env.local`.
**Skill does not print the hex to the chat.**

**Walked BETTER_AUTH_URL (SKILL.md:131):**

Skill appends `BETTER_AUTH_URL="http://localhost:3000"`.

**Walked install + migrate (SKILL.md:135–141):**

```bash
test -d node_modules || npm install
npm run db:generate
npm run db:migrate
```

If `db:migrate` fails, skill halts and surfaces stderr verbatim. Verified
the failure-handling path below.

**Walked verify sign-up (SKILL.md:145–153):**

Skill prints the 4-line manual checklist, runs `npm run dev` in the
foreground, waits for `verified` or `failed: <reason>`. On `verified`,
proceeds to STEP 5.

**Verdict:** PASS.

---

## STEP 5 — Module selection

Skill reads `@references/module-catalog.md` and renders:

```
Add modules:
  1. stripe          (no prereqs)
  2. ai-sdk          (no prereqs)
  3. blob            (no prereqs)
  4. email-resend    (no prereqs)
  5. vitest          (no prereqs)
  6. role-gates      (no prereqs)
  7. admin-scaffold  (requires role-gates)
```

All 7 module directories exist under `modules/`. Hypothetical Dev picks
`role-gates, email-resend, blob` (skipping stripe, ai-sdk, vitest,
admin-scaffold for now).

Topological sort: role-gates has no prereqs, email-resend has no prereqs,
blob has no prereqs — any order is valid. Skill picks insertion order
`role-gates → email-resend → blob`.

**Detailed walkthrough of `role-gates` install** via `@scripts/apply-module.md`:

| apply-module step | Action | Verdict |
|-------------------|--------|---------|
| 1. Resolve | Read `modules/role-gates/README.md`, confirm H2 ordering. | **FAIL — see issue #1 below.** README contains 7 H2s (`What this gives you` → `Prerequisites` → `Environment variables` → `Install` → `Verify` → `Known limitations` → `Uninstall`), but apply-module.md hardcodes 6 H2s "in this exact order". Strict parse halts here. |
| 2. Prerequisites | Parse Prerequisites bullets ("none"). | PASS (only after step 1 is fixed). |
| 3. Env example → .env.local | Read `modules/role-gates/env.example`. It contains only `# ...` comment lines, no `KEY=` pairs. Per apply-module.md:40 ("If `env.example` is empty or absent, skip to step 5") — though the file is non-empty (it has comments), no `KEY="value"` line matches the loop in step 3, so step 3 is effectively skipped. | PASS. |
| 4. Walk env keys | No keys from step 3 → loop is empty. | PASS. |
| 5. Env schema diff | Read `## Install` of the README, find the "Add to `src/lib/env.ts`" diff, apply, run `npm run typecheck`. | PASS. |
| 6. Deps | Read `modules/role-gates/deps.json`, merge into `package.json`, run `npm install`. | PASS. |
| 7. Copy src/ | Copy per README's "Copy `modules/role-gates/src/<file>` → `src/<dest>`" entries. Overwrite policy: halt unless README says "replace". | PASS (assuming README diffs are well-formed). |
| 8. Schema diff + migrate | Apply `src/lib/db/schema.ts` diff (role-gates adds `role` column to `user`). `modules/role-gates/migrations/` does NOT exist as a directory in the trunk, so the `[ -d ]` check is false; nothing to copy. Run `npm run db:generate` + `npm run db:migrate`. | PASS. |
| 9. Wire diffs | Apply each "Wire into existing file" diff. | PASS. |
| 10. Verify | Print README's `## Verify` to Dev; wait for `verified` / `failed: …`. | PASS. |
| 11. Record | Marker doesn't exist yet (initial onboarding); queue `role-gates` for STEP 7 to write. | PASS. |

The next module, `email-resend`, would then run through the same 11
steps. Its env.example has 2 keys (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`),
both documented in `env-key-sources.md`. Skill prompts Dev for each value
WITHOUT echoing it back. Then `blob` would install (its `BLOB_READ_WRITE_TOKEN`
is also documented — and on the Vercel Marketplace path from STEP 4 it
may already be in `.env.local`).

**Verdict:** PASS-WITH-ISSUES. See issues #1 and #2 below.

---

## STEP 6 — Vercel link (optional)

If Dev already ran `vercel link` in STEP 4 (choice 3), the skill detects
existing link via the presence of `.vercel/project.json` and offers to
skip. Otherwise:

```
Skill: Link this repo to a Vercel project now? (yes/later)
Dev:   yes
Skill: <runs `vercel link`>
Skill: Push BETTER_AUTH_URL to production? (yes/no)
Dev:   yes (production URL is https://my-new-saas.vercel.app, NOT localhost)
```

Note: the skill literally pushes the `.env.local` value
`http://localhost:3000` if Dev says yes without overriding. That's a
papercut — STEP 6 should arguably prompt for a separate production URL
override instead of blindly pushing the local value. Documented in §"Open
issues" as #3 (low-severity advisory, not a blocker).

For SECRET keys (`DATABASE_URL`, `BETTER_AUTH_SECRET`, plus any module
secrets like `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`), skill prints the
list and instructs Dev to paste into the Vercel dashboard manually —
**without itself echoing the values** (anti-pattern §1).

`SKILL.md:197` correctly skips STEP 6 on re-entrant runs.

**Verdict:** PASS.

---

## STEP 7 — Finalize

Skill writes `.agenticbuilder-onboarded`:

```
# AgenticBuilder onboarding marker — do not delete.
# Touching this file disables the onboarding skill's auto-greet on next open.
onboarded_at: 2026-05-23T14:32:11Z
project_name: my-new-saas
project_title: MyNewSaaS
installed_modules:
  - role-gates
  - email-resend
  - blob
```

`docs/brainstorm-handoff-2026-05-22.md` IS present in trunk, so the
delete prompt fires:

```
Skill: The brainstorm handoff at docs/brainstorm-handoff-2026-05-22.md
       is template-author scratch. Delete it? (type 'yes' to confirm)
Dev:   yes
Skill: <runs `rm docs/brainstorm-handoff-*.md`>
```

Skill prints the suggested `git add -A && git commit -m "chore: complete
onboarding (role-gates, email-resend, blob)"` and the summary, but
**does NOT run the commit** (per `SKILL.md:228`).

**Verdict:** PASS.

---

## Re-entrance test

Hypothetical: a week later, Dev says "install module ai-sdk".

- Skill activates (matches the description trigger "install module").
- STEP 1 reads `.agenticbuilder-onboarded` → marker is present → greets
  "You're already onboarded. Want to add more modules?"
- Dev: `yes`.
- Skill skips to STEP 5 with the catalog filtered to NOT-installed
  modules. `installed_modules:` contains `role-gates, email-resend,
  blob`, so the filtered catalog shows:

```
Add more modules:
  1. stripe          (no prereqs)
  2. ai-sdk          (no prereqs)
  3. vitest          (no prereqs)
  4. admin-scaffold  (requires role-gates)  ← satisfied
```

- Dev picks `2` (ai-sdk). Apply-module runs ai-sdk install (1 env key:
  `AI_GATEWAY_API_KEY`, documented in env-key-sources.md).
- Skill skips STEPs 2/3/4/6 (per `SKILL.md:246`) and jumps to STEP 7,
  appending `ai-sdk` to `installed_modules:` in the marker.

**Verdict:** PASS.

---

## `--force` test

Hypothetical: Dev wants to start over from scratch and passes `--force`.

- Skill replies (per `SKILL.md:248–250`):
  > "Re-running from scratch will overwrite your project name and
  > re-prompt for all env vars. Are you sure? (type 'yes')"
- Dev: `yes`.
- Skill ignores the marker and runs the full 7-step flow from STEP 2
  (skipping STEP 1's marker detection).

Note: `SKILL.md` defines the `--force` warning and confirm prompt, but
does NOT specify the mechanism by which the skill _detects_ the
`--force` flag (Claude Code skills don't take argv directly — `--force`
would arrive as part of the user's natural-language request). In
practice this means Dev says "re-run onboarding with --force" or
similar and Claude interprets the intent. Documented in §"Open issues"
as #4 (low-severity advisory).

**Verdict:** PASS.

---

## Failure-handling test

Hypothetical: in STEP 4d's `npm run db:migrate`, the DATABASE_URL is
malformed (wrong password, typo in host, …). drizzle-kit exits non-zero
with stderr like:

```
error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1494:16)
```

Per anti-pattern §3 ("Halt on failure. Any non-zero exit code … stops
the flow. Print stderr verbatim and ask the user what to do. Do not
retry, skip, or work around."), the skill:

1. Stops mid-STEP-4.
2. Prints the drizzle-kit stderr verbatim.
3. Does NOT write the marker (`.agenticbuilder-onboarded` stays absent).
4. Asks Dev what to do.

Dev fixes `.env.local`'s `DATABASE_URL`, re-invokes the skill ("retry
onboarding"). STEP 1 finds the marker absent → STEP 2 finds the package
name is still `agenticbuilder` (rename hasn't been re-run because the
user re-ran a partial path) → BUT here is where the skill is
**ambiguous**: re-entering on a partially-completed onboarding, the
skill will re-prompt for project name, then re-prompt for OWNER_EMAIL
(which is already in `.env.local`), etc. There's no explicit "resume
where you left off" logic.

This is documented in §"Open issues" as #5 (medium-severity advisory).
For the failure scenario tested here it is non-fatal — Dev simply
accepts the same answers twice and the writes are idempotent — but it
is a real UX papercut.

**Verdict:** PASS. The halt-on-failure contract is correctly enforced.

---

## Secret-safety test

Checked every path where a secret enters the chat:

| Path | Mechanism | Echoed back? |
|------|-----------|--------------|
| STEP 4b — BETTER_AUTH_SECRET generation | Skill runs `node -e "…"`, captures stdout, writes to `.env.local`. | **No** — `SKILL.md:127` explicitly forbids printing. |
| STEP 4a — DATABASE_URL paste (choices 1/2) | Dev pastes into chat; skill writes to `.env.local`. | **No** — `SKILL.md:115` says "without echoing the value back". |
| STEP 4a — DATABASE_URL via Vercel Marketplace (choice 3) | `vercel env pull` writes directly to `.env.local`. | **No** — skill never reads the file. |
| STEP 5 — module env keys (Stripe SK, Resend API key, Blob token, …) | apply-module.md step 4 sub-step 5: "Do not echo the value back". | **No** — explicitly forbidden. |
| STEP 6 — pushing SECRET env keys to Vercel | Skill prints the list of key NAMES only and instructs Dev to paste in the dashboard. | **No** — skill never handles the values. |
| STEP 6 — pushing NON-secret env keys (`BETTER_AUTH_URL`, `OWNER_EMAIL`) | `echo "<value>" | vercel env add <KEY> production`. The value is in the bash command. | The `OWNER_EMAIL` is mildly sensitive (it's the owner-bypass key per role-gates) but is technically not a "secret" in the spec's classification. This is consistent with the spec but worth a note. |

**Verdict:** PASS. Secret-safety contract is honored everywhere it
matters.

---

## Anti-patterns verification

Spec §5 lists 4 anti-patterns. `SKILL.md:20–40` adds a 5th (module
mutations come from the README). All are honored:

| Anti-pattern | Where enforced | Honored? |
|--------------|----------------|----------|
| No secret echo | `SKILL.md:22–25`, `SKILL.md:115`, `SKILL.md:127`, `apply-module.md:53` | YES |
| No destructive ops without explicit `yes` | `SKILL.md:26–29`, `SKILL.md:70`, `SKILL.md:216–219`, `apply-module.md:92–94` | YES |
| Halt on failure | `SKILL.md:30–33`, `SKILL.md:141`, `apply-module.md:22`, `apply-module.md:69`, `apply-module.md:84`, `apply-module.md:115`, `apply-module.md:141–152` | YES |
| Env writes go through `src/lib/env.ts` first | `SKILL.md:34–36`, `apply-module.md:57–69` (step 5 BEFORE step 6 deps) | YES |
| Module mutations from README, not skill | `SKILL.md:37–40`, the whole of `apply-module.md` references the README verbatim | YES |

---

## Open issues

### Issue #1 — role-gates README has 7 H2s; apply-module step 1 demands exactly 6 [HIGH]

**File:** `modules/role-gates/README.md`
**Conflict with:** `.claude/skills/agenticbuilder-onboarding/scripts/apply-module.md:10–24`

apply-module step 1 says:

> Confirm `modules/<name>/README.md` exists and contains H2 sections in
> this exact order:
> - `## What this gives you`
> - `## Prerequisites`
> - `## Environment variables`
> - `## Install`
> - `## Verify`
> - `## Uninstall`
>
> If any section is missing or out of order, halt with: "module <name>
> README malformed …"

But `modules/role-gates/README.md` has 7 H2s:

```
3:## What this gives you
7:## Prerequisites
11:## Environment variables
17:## Install
174:## Verify
181:## Known limitations    ← extra H2
190:## Uninstall
```

Strict reading: apply-module halts on role-gates. Since `admin-scaffold`
depends on `role-gates`, this also blocks `admin-scaffold`.

**Fix options:**
- (A) Loosen `apply-module.md:10–24` to "contains these 6 H2s, in this
  order — extras between them are OK". Recommended.
- (B) Move `## Known limitations` out of the H2 sequence in role-gates'
  README (rename to `### Known limitations` inside `## Verify` or
  `## Uninstall`).
- (C) Update `apply-module.md` to expect the 7-H2 form for modules that
  document known limitations.

(A) is the highest-leverage fix because future modules will also have
optional extra sections.

### Issue #2 — vitest env key `DATABASE_URL_TEST` is undocumented in env-key-sources.md [HIGH]

**Files:**
- `modules/vitest/env.example` (line: `DATABASE_URL_TEST="postgresql://..."`)
- `.claude/skills/agenticbuilder-onboarding/references/env-key-sources.md`
  (says `## vitest \n No env keys.`)

apply-module step 4 sub-step 2 says:

> If absent, halt with: "no source documented for <KEY> — update
> `env-key-sources.md` before installing this module."

When Dev installs vitest, apply-module will read its env.example, find
`DATABASE_URL_TEST`, look it up in env-key-sources.md, not find it, and
halt.

**Fix:** add a `## vitest` block to env-key-sources.md with a
`### DATABASE_URL_TEST` entry pointing at the Neon Console branches
page. The information is already documented in
`modules/vitest/env.example`'s comments — just needs to be lifted into
env-key-sources.md in the format the skill expects.

### Issue #3 — STEP 6 pushes BETTER_AUTH_URL=http://localhost:3000 to production [LOW]

**File:** `.claude/skills/agenticbuilder-onboarding/SKILL.md:182–187`

The skill iterates `BETTER_AUTH_URL` and `OWNER_EMAIL` from `.env.local`
and offers to `echo "<value>" | vercel env add <KEY> production`. But
the `.env.local` value of `BETTER_AUTH_URL` is `http://localhost:3000`
— useless in production.

**Fix:** in STEP 6, for `BETTER_AUTH_URL` specifically, prompt the user
for the production URL (e.g., `https://<project>.vercel.app`) instead of
reusing the local value. Or instruct the user to set it after first
deploy when they know the canonical URL.

### Issue #4 — `--force` flag detection is implicit [LOW]

**File:** `.claude/skills/agenticbuilder-onboarding/SKILL.md:248–250`

The skill describes `--force` behavior but doesn't define how the skill
detects the flag. Claude Code skills receive natural-language requests,
not argv. In practice Dev types "re-run onboarding with --force" and
Claude infers intent — workable but fragile.

**Fix:** rephrase to "If the user explicitly asks to re-run, restart, or
overwrite the existing setup …" so the trigger is intent-based rather
than literally an argv flag.

### Issue #5 — No "resume from partial onboarding" path [MEDIUM]

**File:** `.claude/skills/agenticbuilder-onboarding/SKILL.md:42–54`

If STEP 4d fails mid-flow (e.g., bad DATABASE_URL), the marker is never
written. On retry, STEP 1 sees the marker absent and runs the full flow
from STEP 2, re-prompting for the project name (already renamed) and
OWNER_EMAIL (already in `.env.local`). The writes are idempotent so
nothing breaks, but Dev re-answers questions they've already answered.

**Fix:** STEP 1 could probe for partial state before deciding the path:
- If `package.json#name != "agenticbuilder"` → rename already done → skip
  STEP 2.
- If `.env.local` exists and contains `OWNER_EMAIL=…` → skip STEP 3.
- If `.env.local` contains `DATABASE_URL=…` and `BETTER_AUTH_SECRET=…` →
  skip STEP 4a/4b/4c; still run 4d/4e to verify.
- Then jump to whichever step is the first unfinished one.

This is a quality-of-life improvement, not a blocker; the skill works
correctly without it.

---

## Verdict

**Skill is READY with two HIGH-severity fixes needed before STEP 5 can
actually exercise role-gates / admin-scaffold / vitest end-to-end:**

- Fix issue #1 (loosen apply-module step 1 to allow extra H2s, OR remove
  the `## Known limitations` H2 from role-gates).
- Fix issue #2 (add `## vitest` + `### DATABASE_URL_TEST` to
  env-key-sources.md).

Without these fixes, the skill works correctly for:
- STEPs 1–4 (no module-dependent code).
- STEP 5 against `stripe`, `ai-sdk`, `blob`, `email-resend` (their
  READMEs all have the canonical 6 H2s and their env keys are all
  documented).
- STEPs 6–7 (no module dependency).

With these fixes, the skill exercises all 7 modules cleanly.

Issues #3–#5 are low-to-medium quality-of-life advisories that do NOT
block shipping. They can be addressed in a follow-up.

## Sign-off

Self-test executed on 2026-05-23 against commit `56078f6` on `main`
(5 commits ahead of `origin/main`; trunk = Plan A + Plan B + Plan C
tasks 1–6). All 7 modules from Plan B are present under `modules/`.
The skill is committed at `.claude/skills/agenticbuilder-onboarding/`
and ready to be exercised on a fresh clone once issues #1 and #2 are
addressed.
