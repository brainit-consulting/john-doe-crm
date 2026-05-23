# AgenticBuilder modules

This folder is a **shelf** of opt-in capabilities. Each `modules/<name>/`
is a self-contained instructions packet: a README with verbatim install
steps, source files to drop into `src/`, declared deps, env keys, and any
DB migrations the module owns. **No codemod scripts** — the README is the
contract.

> **Status:** All seven modules are present under `modules/<name>/`. Six
> are also INSTALLED in the trunk reference build (v0.2.0+); the `stripe`
> module is artifact-only pending Stripe test-mode setup.

## Why not codemod scripts?

A codemod is opaque and breaks the moment a host project's file shape
drifts. A README + verbatim diffs is something a human (or the onboarding
skill at `.claude/skills/agenticbuilder-onboarding/`) can follow,
debug, and reverse.

## Folder shape

```
modules/<name>/
├── README.md           ← THE contract
├── src/                ← files copied into src/ during install
├── env.example         ← keys appended to .env.example
├── deps.json           ← { "dependencies": {...}, "devDependencies": {...} }
└── migrations/         ← optional drizzle migrations
```

## Required README structure

Every module's `README.md` MUST contain these six H2 sections in this
order so the onboarding skill can parse it deterministically.
**Additional H2 sections** (e.g., `## Known limitations`,
`## Troubleshooting`, `## Security notes`) **are allowed** between or
after them — the install routine uses only the six required ones.

```markdown
# <Module Name>

## What this gives you
<one paragraph; concrete user-facing capabilities>

## Prerequisites
- <other modules that must be installed first>
- <external accounts needed>

## Environment variables
| Key | Required | Where to get it | Example |
|---|---|---|---|

## Install
1. `npm install <pkg>`            (from deps.json)
2. Copy `modules/<name>/src/<file>` → `src/<dest>`
3. Add to `src/lib/env.ts`:        (verbatim diff)
4. Add to `src/lib/db/schema.ts`:  (verbatim diff)
5. Run `npm run db:generate && npm run db:migrate`
6. Wire into existing file:        (verbatim diff)

## Verify
<a specific user-visible thing to do that proves it works>

## Uninstall
<reverse steps, listed explicitly>

<!-- Optional extra sections (e.g. ## Known limitations) may follow -->
```

## The seven modules

| Module | What it adds | Depends on | Installed in trunk? |
|---|---|---|---|
| `stripe` | `src/lib/stripe/`, `/api/stripe/webhook`, `/billing` page, separate `subscription` table (FK → `user.id`) | — | No (artifact-only) |
| `ai-sdk` | `src/lib/ai/`, `/api/chat` streaming route, `<Chat>` component, model picker via Vercel AI Gateway | — | Yes |
| `blob` | `src/lib/blob.ts`, `/api/upload` signed URL route, `<FileUpload>` component, `attachment` table | — | Yes |
| `email-resend` | `src/lib/email/`, template dir, `sendEmail()` helper, Better-Auth email-verification + real password reset | — | Yes |
| `vitest` | Expanded testing scaffold on top of trunk's minimal vitest: integration tests with a real Neon test branch, Playwright e2e scaffold, GitHub Actions CI workflow | — | Yes |
| `role-gates` | `role` column on `user` (`'user' \| 'admin'`), `requireRole()` server helper, `<RequireRole>` client gate, **owner-bypass keyed on `OWNER_EMAIL`** | — | Yes |
| `admin-scaffold` | `(app)/admin/*` routes (users list, role editor) | `role-gates` | Yes |

## Installing a module manually

1. `cd` to the project root.
2. Open `modules/<name>/README.md` and follow the numbered steps verbatim.
3. After installation, run the **Verify** step.

If you have Claude Code installed, prefer the onboarding skill (Plan C)
which automates this with context about your repo.
