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
