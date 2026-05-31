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
| `src/app/(app)/_components/FileUpload.tsx` | the help text mentioning the `agenticbuilder/` upload prefix; rename the visible label to the new kebab slug (also update `src/lib/blob.ts` `ROOT_PREFIX` to match) |
| `src/app/api/chat/route.ts`                | the system-prompt string mentioning "AgenticBuilder demo app"          |
| `src/lib/blob.ts`                          | the `ROOT_PREFIX` constant (`"agenticbuilder"`) and the doc-comment references; KEEP the prefix in sync with `FileUpload.tsx` help text |
| `src/lib/email/templates/welcome.ts`       | subject + greeting + signature lines mentioning "AgenticBuilder"       |
| `src/lib/email/templates/verify.ts`        | subject + body + signature lines mentioning "AgenticBuilder"           |
| `src/lib/email/templates/password-reset.ts`| subject + body + signature lines mentioning "AgenticBuilder"           |
| `e2e/auth.spec.ts`                         | the `getByRole("heading", { name: /AgenticBuilder/i })` matcher — must match the new Title Case name |
| `package-lock.json`                        | the top-level `"name"` field (one line). npm normally rewrites this on the next `npm install`, but the rename checklist patches it directly so a fresh-clone repo isn't internally inconsistent before the first install |
| `AGENTS.md`                                | any prose mentioning "AgenticBuilder" the project — H1, references in §1 "Project shape". Leave the `agenticbuilder-onboarding` skill name + `agenticbuilder` family references alone |
| `src/app/(app)/notes/README.md`            | template-specific intro lines mentioning AgenticBuilder by name |
| `docs/design-system.md`                    | H1, "Brand wordmark (AgenticBuilder)" row, brand-link prose, and the "If you're using AgenticBuilder for a project that isn't in this brand family" line — rewrite all to the new Title Case name |

## Files to LEAVE ALONE

These keep the historic "agenticbuilder" name on purpose. Renaming them
breaks the audit trail or breaks the skill itself.

- `modules/README.md` and `modules/*/README.md` — module docs are
  shared with the template family.
- `modules/*/src/**` and `modules/*/env.example` — module artifacts
  are shared with the template family; the trunk copies the renamed
  versions, but the source-of-truth in `modules/` stays as-is.
- `modules/vitest/e2e/auth.spec.ts` — module artifact; the renamed
  copy lives at `e2e/auth.spec.ts` (handled above).
- `docs/superpowers/**` — design history if present in legacy clones;
  never rewrite. (Fresh clones from the trunk no longer ship this dir.)
- `.claude/skills/agenticbuilder-onboarding/**` — the skill itself
  (including this checklist) when installed at project scope. The
  skill stays named after the boilerplate, not the renamed project.
  (Fresh clones from the trunk no longer ship an embedded copy; the
  skill is installed globally via `npx skills add -g …`.)
- `CLAUDE.md` — one line (`@AGENTS.md`); nothing to rename.
- `.env.local` — user-specific runtime values; gitignored. Comments
  inside it are harmless and the skill never touches it for rename.
- `CHANGELOG.md` — empty skeleton in fresh trunk; nothing to rename.
  Legacy clones may have inherited the template's version history —
  factual references to past states, do not rewrite.
- `.agenticbuilder-onboarded` (legacy clones only) — the trunk no
  longer ships this marker. If a legacy clone still has one with the
  template-author shape (no `progress:` block), STEP 1 treats it as
  "no marker" and falls through; STEP 2 leaves the file untouched and
  STEP 7 overwrites it with the real onboarding marker.

## How to use this checklist

The skill's STEP 2 follows this loop:

1. Read this file.
2. For each row in "Files to rewrite", `Read` the file, apply the
   substitutions (kebab + Title Case) ONLY on the indicated lines, and
   `Edit` the file back.
3. Run the verification grep below.
4. If anything other than a LEAVE-ALONE file is printed, the rename is
   incomplete — halt with the list of stragglers so a human can update
   this checklist.

## Verification after rename

After applying the substitutions, the skill runs:

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

Two intentional non-obvious bits in that grep:

- `--exclude-dir` matches by directory **basename**, not path — that's
  why we exclude `.claude` whole and the dir named `superpowers`.
  Path-style values like `.claude/skills` or `docs/superpowers` would
  silently never match and leak the skill's own files into the
  stragglers list.
- `agenticbuilder([^-]|$)` (POSIX extended regex via `-E`) matches the
  project name only when followed by a non-dash character or
  end-of-line — skipping intentional `agenticbuilder-*` family
  references such as `agenticbuilder-onboarding` (this skill) and any
  other agenticbuilder family artifact, which survive the rename on
  purpose. POSIX form is portable; PCRE `agenticbuilder(?!-)` would
  need `LC_ALL=C.UTF-8 grep -P` on some Git-Bash installs.

Expected on a fresh trunk clone: zero matches. Legacy clones may print
files from the LEAVE ALONE list above (`CLAUDE.md`, `CHANGELOG.md`,
`docs/brainstorm-handoff-*.md`, `.env.local`,
`.agenticbuilder-onboarded`); those are fine to leave.

If anything else is printed, halt and report the list of stragglers so
the checklist can be updated — do not blind-rewrite them.
