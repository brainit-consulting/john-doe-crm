# AgenticBuilder

A lean Next.js 16 + Better-Auth + Drizzle/Neon quickstart for new SaaS apps.

Trunk: auth, DB, a working `notes` demo feature, conventions. Modules:
opt-in Stripe billing, Vercel AI SDK, Vercel Blob, Resend email, expanded
testing, role gates, admin dashboard.

## Quick start (manual)

1. Use this template (GitHub) or `git clone … && rm -rf .git && git init`
2. `npm install`
3. Copy `.env.example` → `.env.local` and fill in:
   - `DATABASE_URL` — a Neon Postgres URL (https://console.neon.tech)
   - `BETTER_AUTH_SECRET` — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `BETTER_AUTH_URL` — `http://localhost:3000` for dev
   - `OWNER_EMAIL` — your email (bypasses every role/tier gate)
4. `npm run db:generate && npm run db:migrate`
5. `npm run dev` and visit http://localhost:3000

## Quick start (Claude Code)

Install the onboarding skill globally once, then trigger it in any
agent that supports skills (Claude Code, Cursor, etc.):

```bash
npx skills add -g brainit-consulting/agenticbuilder-onboarding
```

Open a fresh terminal in an empty directory and say *"create an
agenticbuilder app"* — the skill scaffolds the repo from this template,
renames it, sets up the database and auth secret, lets you pick modules,
and links Vercel. Already inside an unmodified clone of this repo? Just
say *"onboard"* and it picks up at the rename step.

## Two paths through this template

This template can be used two ways. Pick what matches your project.

### Path A — "Full demo" (recommended for first-time users)

Clone the default branch. You get the trunk PLUS all 6 modules already
installed and wired into the demo (auth, email-verification, password
reset, AI-Gateway chat, blob uploads, vitest integration tests,
admin dashboard, role gates). The onboarding skill renames + sets up
env, but doesn't strip modules.

```bash
gh repo create my-app --template brainit-consulting/agenticbuilder --private
```

### Path B — "Lean" (use the skill's module-add flow as designed)

Clone the `v0.1.0` tag — the lean trunk before any modules were
installed. The skill's STEP 5 will offer each module as a checklist;
pick only what you need.

```bash
gh repo create my-app --template brainit-consulting/agenticbuilder --private
cd my-app && git checkout v0.1.0
```

## Modules

Each `modules/<name>/` is a self-contained instructions packet (README +
source + deps + env example + migrations). Open the README for install
steps. See `modules/README.md` for the shelf contract.

## Conventions

See [AGENTS.md](./AGENTS.md). `CLAUDE.md` aliases to it.

## Stack

Next.js 16.2.6 · React 19.2.4 · TypeScript 5 · Tailwind v4 · Better-Auth
1.6.11 · Drizzle ORM 0.45.2 · Neon serverless 1.1.0 · Zod 4 · Vitest 4

## License

MIT (set at publish time).
