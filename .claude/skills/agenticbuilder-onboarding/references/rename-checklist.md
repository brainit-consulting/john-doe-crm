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

## Files to LEAVE ALONE

These keep the historic "agenticbuilder" name on purpose. Renaming them
breaks the audit trail or breaks the skill itself.

- `AGENTS.md` — references "AgenticBuilder" the project family; the
  manual is inherited by every project built from the template.
- `modules/README.md` and `modules/*/README.md` — module docs are
  shared with the template family.
- `modules/*/src/**` and `modules/*/env.example` — module artifacts
  are shared with the template family; the trunk copies the renamed
  versions, but the source-of-truth in `modules/` stays as-is.
- `modules/vitest/e2e/auth.spec.ts` — module artifact; the renamed
  copy lives at `e2e/auth.spec.ts` (handled above).
- `docs/superpowers/specs/*.md` and `docs/superpowers/plans/*.md` —
  design history; never rewrite (the GitHub template-cleanup action
  removes these on first commit anyway).
- `docs/brainstorm-handoff-*.md` — historical scratch; STEP 7 offers
  to delete it entirely rather than rename.
- `.claude/skills/agenticbuilder-onboarding/**` — the skill itself
  (including this checklist). The skill stays named after the
  boilerplate, not the renamed project.
- `.github/template-cleanup.yml` — references seed files by name; the
  action removes itself on first run.
- `src/app/(app)/notes/README.md` — internal reference doc; mentions
  "AgenticBuilder" once as the template family.
- `package-lock.json` — generated; npm rewrites the `"name"` reference
  automatically on the next `npm install` (but the skill should NOT
  edit `package-lock.json` by hand).
- `CLAUDE.md` — one line (`@AGENTS.md`); nothing to rename.
- `.env.local` — user-specific runtime values; gitignored. Comments
  inside it are harmless and the skill never touches it for rename.

## How to use this checklist

The skill's STEP 2 follows this loop:

1. Read this file.
2. For each row in "Files to rewrite", `Read` the file, apply the
   substitutions (kebab + Title Case) ONLY on the indicated lines, and
   `Edit` the file back.
3. Re-run the verification grep below.
4. If anything is printed, the rename is incomplete — stop and report
   the unhandled path so a human can update this checklist.

## Verification after rename

After applying the substitutions, the skill runs:

```bash
grep -ril "agenticbuilder" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next . \
  | grep -v -E "(^./AGENTS.md$|^./modules/|^./docs/superpowers/|^./docs/brainstorm-handoff|^./.claude/skills/agenticbuilder-onboarding/|^./.github/template-cleanup.yml$|^./src/app/\(app\)/notes/README.md$|^./package-lock.json$|^./CLAUDE.md$|^./.env.local$)"
```

Expected: prints nothing. Any file printed here is a missed rewrite —
the skill stops and reports the unhandled path so the checklist can be
updated.
