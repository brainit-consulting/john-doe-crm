# AgenticBuilder Modules — design spec

**Date:** 2026-05-23
**Status:** Approved (brainstorm → spec)
**Author:** Emile du Toit + Claude Opus 4.7
**Depends on:** v0.1.0 trunk (see `docs/superpowers/specs/2026-05-22-agenticbuilder-design.md`)
**Next step:** implementation plan via `superpowers:writing-plans`

## 0. Summary

The trunk shipped with empty `modules/` slots and a parse-friendly contract
in `modules/README.md`. Plan B fills in the seven modules so they can be
installed onto a trunk clone using only the steps in their README — by a
human reading along, or by the onboarding skill (Plan C).

Every module conforms to the shelf contract from `modules/README.md`
(folder layout, required H2 sections, deps.json + env.example + optional
migrations).

## 1. Module shelf invariants

These are reaffirmations of the trunk contract that bind ALL seven
modules. If a module needs to break one of these, escalate to a spec
change.

- Each module is a single folder `modules/<name>/`.
- `README.md` is THE contract. The six H2 sections are required and
  appear in fixed order: *What this gives you*, *Prerequisites*,
  *Environment variables*, *Install*, *Verify*, *Uninstall*.
- `deps.json` declares ALL packages a module needs (no transitive
  expectation). Onboarding merges it into the project's `package.json`.
- `env.example` is appended to the project's `.env.example`. Each key
  also lands in `src/lib/env.ts`'s zod schema as part of the Install
  steps.
- `src/` files in the module are copied verbatim into the project's
  `src/`. Conflict resolution is the installer's problem; the README
  must call out any expected overwrites.
- DB-bearing modules ship a `migrations/` folder generated AFTER the
  module's `schema.ts` changes have been applied, OR explicitly call out
  `db:generate` as an install step (preferred — keeps migrations local
  to the project, not the module). **Preferred:** install steps include
  `db:generate && db:migrate`; the module ships only schema deltas.
- All modules MUST honor AGENTS.md §3:
  - No `process.env.X` outside `src/lib/env.ts`.
  - No UUIDs in UI.
  - `OWNER_EMAIL` bypasses every gate.
  - Plans + status docs for non-trivial work.
- `Verify` step must be reachable in a browser or via a single CLI
  command; "verify by reading the code" is not acceptable.

## 2. Per-module designs

### 2.1 `stripe` — Stripe Checkout + Customer Portal billing

**Pattern:** Checkout Sessions (hosted) for subscription start; Customer
Portal for self-serve plan changes / cancellation. Trade-off accepted:
less control over UI, vastly less code.

**Adds to project:**
- `src/lib/stripe/server.ts` — typed Stripe SDK client.
- `src/lib/stripe/plans.ts` — single source of truth for plans (name,
  price ID, features). Three plan slots out of the box: `free`, `pro`,
  `team`. Price IDs come from env (`STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`).
- `src/lib/db/schema.ts` delta — new `subscription` table:
  - `id` (text PK, nanoid)
  - `userId` (FK → user.id, cascade, UNIQUE — one sub per user for v1)
  - `stripeCustomerId` (text, unique)
  - `stripeSubscriptionId` (text, unique nullable — null for free tier)
  - `plan` (text, default `'free'`)
  - `status` (text — `'active' | 'past_due' | 'canceled' | 'incomplete'`)
  - `currentPeriodEnd` (timestamp nullable)
  - `createdAt` / `updatedAt`
- `src/lib/db/queries.ts` delta — `getSubscriptionForUser`,
  `upsertSubscription`, `setSubscriptionStatus`.
- `src/app/api/stripe/webhook/route.ts` — verifies signature, handles
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- `src/app/api/stripe/checkout/route.ts` — creates Checkout Session.
- `src/app/api/stripe/portal/route.ts` — creates Customer Portal session.
- `src/app/(app)/billing/page.tsx` — current plan + "Manage billing"
  (portal) + "Upgrade to Pro" (checkout) buttons.
- `src/lib/auth/server.ts` patch — on signup, the Better-Auth `user.create`
  hook creates a Stripe customer and a `subscription` row with
  `plan='free'`, `status='active'`.

**Env vars:**

| Key | Required | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | Stripe Dashboard → Developers → API keys (use `sk_test_…` for dev) |
| `STRIPE_WEBHOOK_SECRET` | yes | Stripe Dashboard → Developers → Webhooks → Add endpoint pointing at `https://<your-url>/api/stripe/webhook`, copy signing secret |
| `STRIPE_PRICE_PRO` | yes | Stripe Dashboard → Products → Pro → Price ID |
| `STRIPE_PRICE_TEAM` | yes | Same, for Team |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | yes | Stripe Dashboard → Developers → API keys (`pk_test_…`) |

**Prerequisites:** Stripe account; three Products (Free, Pro, Team) with
recurring monthly prices.

**Verify:** Visit `/billing`, click "Upgrade to Pro" → Stripe Checkout
opens → use test card `4242 4242 4242 4242` → return to `/billing` →
shows "Plan: pro" with "Manage billing" button.

**Owner bypass:** `OWNER_EMAIL` users see all features regardless of plan.
The `requireRole`/`requirePlan` helpers from role-gates check
`session.user.email === env.OWNER_EMAIL` first.

### 2.2 `ai-sdk` — Vercel AI Gateway streaming chat

**Pattern:** Vercel AI Gateway (one key, many providers). Default model
Claude Sonnet 4.6; model picker also offers Opus 4.7, GPT-5, Gemini 2.5.
Uses `ai` SDK (Vercel) for streaming.

**Adds to project:**
- `src/lib/ai/gateway.ts` — wraps `ai`'s gateway provider with our
  defaults.
- `src/lib/ai/models.ts` — list of supported model IDs + display names.
- `src/app/api/chat/route.ts` — streaming POST endpoint accepting
  `{ messages, modelId }`.
- `src/app/(app)/chat/page.tsx` — full-page chat UI with model picker.
- `src/app/(app)/chat/_components/ChatUI.tsx` — `useChat()`-driven client
  component.
- Navbar update: add "Chat" link under role/plan gate (free tier gets
  limited messages — soft cap enforced server-side via `subscription`
  table if `stripe` module is also installed; ungated if not).

**Env vars:**

| Key | Required | Where to get it |
|---|---|---|
| `AI_GATEWAY_API_KEY` | yes | Vercel Dashboard → AI Gateway → API keys |

**Prerequisites:** Vercel AI Gateway enabled on the team.

**Verify:** Visit `/chat`, type "hello", press send → response streams in
within ~2s. Switch model in picker → next message uses new model
(verified by an inline metadata badge showing the model that answered).

### 2.3 `blob` — Vercel Blob uploads

**Pattern:** Signed-URL upload from the client directly to Blob (no
server proxy). Server route returns a short-lived signed URL; client
uploads to it; final URL is stored back via a callback action.

**Adds to project:**
- `src/lib/blob.ts` — typed helper wrapping `@vercel/blob`'s
  `put`/`del`/signed-URL APIs.
- `src/lib/db/schema.ts` delta — new `attachment` table with
  `id`/`userId`/`noteId` (optional FK)/`url`/`pathname`/`size`/`contentType`/`createdAt`.
  Demonstrates "attach files to a record" pattern.
- `src/app/api/upload/route.ts` — POST returns signed URL; auth-gated.
- `src/app/(app)/_components/FileUpload.tsx` — client component with
  drag-drop + progress.
- `src/app/(app)/notes/[id]/_components/Attachments.tsx` — drops into
  the notes detail page; uses `FileUpload` to attach files. (Lights up
  only if blob module is installed; otherwise hidden.)

**Env vars:**

| Key | Required | Where to get it |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | yes | Vercel Dashboard → Storage → Blob → Read/Write token. **Or** any existing Blob store's token (the boilerplate is provider-agnostic re: which store; uploads namespace under `agenticbuilder/<userId>/<filename>` to avoid colliding with other projects sharing the same store). |

**Prerequisites:** A Vercel Blob store (new via `vercel blob create-store`
or existing — the install README explicitly notes that any store the
team owns can be reused without erasing existing content; uploads are
namespaced).

**Verify:** On a note detail page, drag-drop a file → upload progress
shown → file appears in attachments list. Re-open the note → attachment
persists. Click → file opens at the Blob URL.

### 2.4 `email-resend` — Resend transactional email

**Pattern:** `sendEmail()` helper + `templates/` directory of typed
template functions (no JSX templates yet — plain string builders to keep
the demo minimal). Optional Better-Auth email-verification hook.

**Adds to project:**
- `src/lib/email/client.ts` — wraps the Resend SDK.
- `src/lib/email/templates/welcome.ts` — typed template `welcomeEmail({ name }): { subject; html; text }`.
- `src/lib/email/templates/verify.ts` — verification email used by
  Better-Auth hook.
- `src/lib/email/templates/password-reset.ts` — replaces the trunk's
  `/reset` stub with a working flow.
- `src/lib/auth/server.ts` patch — enable Better-Auth's
  `emailAndPassword.requireEmailVerification` and `sendVerificationEmail`
  options pointing at our verify template.
- `src/app/(auth)/reset/page.tsx` upgrade — replaces the stub with a
  real "enter email → we'll send a reset link" flow.
- `src/app/(auth)/reset/[token]/page.tsx` — token landing page.

**Env vars:**

| Key | Required | Where to get it |
|---|---|---|
| `RESEND_API_KEY` | yes | Resend Dashboard → API Keys |
| `EMAIL_FROM` | yes | A verified sender on your Resend domain (e.g., `no-reply@yourapp.com`) |

**Prerequisites:** Resend account; domain verified.

**Verify:** Sign up with a new email → check inbox → verification email
arrives within ~10s. Click link → email marked verified in DB. Visit
`/reset`, enter email → reset link arrives → click → set new password →
sign in with new password.

### 2.5 `vitest` — Expanded testing scaffold

**Pattern:** Builds on the trunk's minimal vitest. Adds (a) integration
tests against a real test DB, (b) Playwright e2e config, (c) GitHub
Actions workflow stub.

**Adds to project:**
- `vitest.config.ts` extension — adds `integration` test project alongside
  the trunk's `unit` config. Integration suite uses a separate
  `DATABASE_URL_TEST` (a different Neon branch — the README explains
  `neon branches create` to provision it).
- `src/test/db.ts` — per-test transactional rollback helper using Drizzle
  transactions. Each `it` runs inside `db.transaction(async (tx) => { …
  throw new RollbackSentinel(); })`.
- `src/test/factories/` — small factories: `makeUser()`, `makeNote()`.
- `src/test/example.integration.test.ts` — sample integration test
  showing the pattern (creates a user, creates two notes, asserts
  `listNotesForUser` returns them, rolls back at end).
- `playwright.config.ts` — Playwright config pinning Chromium, baseURL
  from env, projects for desktop + mobile.
- `e2e/` directory — `e2e/auth.spec.ts` (sample e2e for sign-up + sign-in
  matching the manual E2E we did in Task 17).
- `.github/workflows/test.yml` — GitHub Actions workflow:
  - Job 1: `typecheck` + `lint` + `unit` (no DB needed).
  - Job 2: `integration` (spins up a fresh Neon branch via `neon branches
    create`, runs migrations, runs integration suite, deletes branch).
  - Job 3: `e2e` (builds, starts the app, runs Playwright).

**Env vars:**

| Key | Required | Where to get it |
|---|---|---|
| `DATABASE_URL_TEST` | yes (CI only — opt for `.env.test` locally) | A separate Neon branch's connection URL; create with `neon branches create test --parent main` |
| `NEON_API_KEY` | yes (CI only) | Neon Console → API keys (used by the CI job to create + delete branches) |

**Prerequisites:** Trunk's vitest. Neon CLI for local branch creation
(optional — the README also documents using a local Postgres via Docker).

**Verify:** `npm test` (unit) passes. `npm run test:integration` passes
against the test branch. `npm run test:e2e` passes (requires the dev
server running). `gh workflow run test.yml` succeeds on a PR.

### 2.6 `role-gates` — Role + tier authorization

**Pattern:** Single string `role` column on `user` (`'user' | 'admin'`
out of the box, extensible by adding more values). `OWNER_EMAIL` bypasses
ALL gates unconditionally. `requireRole` for server checks; `<RequireRole>`
for client gates.

**Adds to project:**
- `src/lib/db/schema.ts` delta — adds `role TEXT NOT NULL DEFAULT 'user'`
  to the `user` table.
- `src/lib/auth/server.ts` patch — Better-Auth `additionalFields` config
  exposing `role` on the session user. On signup, if email matches
  `OWNER_EMAIL`, set `role='admin'` automatically.
- `src/lib/auth/roles.ts` — exports:
  - `type Role = "user" | "admin"`
  - `async requireSession()` — returns session or redirects to `/login`
    (DRY helper across pages; replaces the `session!.user.id` non-null
    assertions in the trunk).
  - `async requireRole(role: Role)` — returns session or redirects/throws.
  - `isOwner(email: string): boolean` — `email === env.OWNER_EMAIL`.
  - `effectiveRole(session): Role` — `isOwner` → `'admin'`, else
    `session.user.role`.
- `src/components/auth/RequireRole.tsx` — client-side gate component for
  conditional UI: `<RequireRole role="admin"><AdminLink /></RequireRole>`.

**Env vars:** none new — `OWNER_EMAIL` is already in trunk.

**Prerequisites:** none.

**Verify:** Sign up as `OWNER_EMAIL` → `role='admin'` in DB. Sign up as
another email → `role='user'`. Manually set the second user to admin in
`db:studio` → that user sees admin-only UI. Calling `requireRole("admin")`
from a non-admin session throws / redirects.

**Trunk patch — non-trivial:** This module RETROFITS the trunk to use
`requireSession()` everywhere the trunk currently has `session!.user.id`.
The install README's "Wire into existing file" diffs MUST cover:
- `src/app/(app)/layout.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/notes/page.tsx`
- `src/app/(app)/notes/[id]/page.tsx`
- `src/app/(app)/notes/_actions.ts` (`requireUserId` → `requireSession`)

### 2.7 `admin-scaffold` — `/admin/*` routes

**Pattern:** Server-rendered admin pages gated by `requireRole("admin")`.
Users list with role editor. Depends on `role-gates`.

**Adds to project:**
- `src/app/(app)/admin/layout.tsx` — calls `requireRole("admin")`;
  renders a sub-navbar with "Users".
- `src/app/(app)/admin/page.tsx` — landing.
- `src/app/(app)/admin/users/page.tsx` — paginated users list.
- `src/app/(app)/admin/users/_actions.ts` — `setUserRole(userId, role)`
  server action; uses `requireRole("admin")`.
- `src/app/(app)/admin/users/_components/RoleSelect.tsx` — client
  combobox that calls `setUserRole`.
- Navbar update: add "Admin" link in `(app)/_components/Navbar.tsx`
  visible only when `effectiveRole === "admin"`.

**Env vars:** none new.

**Prerequisites:** `role-gates` must be installed first. The README's
*Prerequisites* section says so explicitly. The onboarding skill enforces
this in step 5 (dep ordering).

**Verify:** Sign in as `OWNER_EMAIL` → "Admin" link appears in navbar →
`/admin/users` lists users → change a user's role via dropdown → page
refreshes → DB reflects the new role.

## 3. Cross-cutting design decisions

### Owner bypass — codified
`role-gates` exports `isOwner(email)` and `effectiveRole(session)`.
EVERY module that adds a permission check MUST go through these
helpers. The `stripe` module's plan gating uses `effectiveRole` to short
circuit (owners see all plans), and the `admin-scaffold` module's
`requireRole("admin")` returns early for owners. No new env var.

### Installation order
Some modules patch trunk files in ways that conflict with each other if
installed in the wrong order. Documented order (also enforced by Plan C's
onboarding skill):

1. `role-gates` (FIRST when used — it changes the auth-helper API the
   other modules call into).
2. `stripe` (uses `effectiveRole` from role-gates if available; degrades
   gracefully if not).
3. `email-resend` (patches `auth/server.ts` to enable verification —
   composes with stripe-customer-on-signup if both installed).
4. `ai-sdk`, `blob` (independent; install whenever).
5. `vitest` (last among the runtime modules — its integration tests
   exercise WHATEVER modules are installed; installing more modules
   later doesn't break vitest).
6. `admin-scaffold` (LAST when used — depends on role-gates).

### Provider-agnostic Blob stores
The `blob` module's README ships a generic install path: any
`BLOB_READ_WRITE_TOKEN` works. The README explicitly says: "if your team
already has a Blob store on the Vercel Hobby plan, reuse it; uploads are
namespaced under `agenticbuilder/<userId>/...` so they can't collide with
other projects." For OUR own dev verification, we connect to the team's
existing `dreamforge-uploads` store.

### Trunk-patch discipline
Modules that patch `src/lib/db/schema.ts`, `src/lib/env.ts`, or
`src/lib/auth/server.ts` MUST include the diff verbatim in the README
under the *Install* section. The onboarding skill applies these
verbatim. No magic — every modification is human-readable.

### Module ↔ module composition
Where a module checks for another's presence (e.g., `ai-sdk`'s chat-quota
gating using `subscription` table from `stripe`), the check is a runtime
`try { await getSubscriptionForUser(userId) } catch { /* no stripe */ }`
pattern with feature degradation. Modules are not allowed to hard-import
from each other's source.

## 4. Acceptance criteria

The implementation is complete when:

- [ ] All seven modules have folders under `modules/` with the six
      required files (`README.md`, `src/`, `env.example`, `deps.json`,
      and `migrations/` where relevant).
- [ ] Each module's README follows the contract exactly (six H2
      sections in order, plus the modules/README.md template structure).
- [ ] Installing each module manually (by following its README) onto a
      fresh trunk clone:
    - Adds the documented files.
    - Updates `env.ts` and `db/schema.ts` as described.
    - Passes `npm run typecheck && npm run lint && npm test && npm run build`.
    - Passes the module's *Verify* step against the live Neon DB and
      (where relevant) a live Stripe test mode / Resend / AI Gateway.
- [ ] Modules can be installed in the documented order without conflict.
- [ ] Owner bypass works: `OWNER_EMAIL` user sees all role-gated UI and
      all plan-gated UI even on `plan='free'`.
- [ ] Trunk's `notes` demo still works after each module is installed.
- [ ] `git tag v0.2.0` lands on the final merge.

## 5. Out of scope (explicit non-goals)

- Multi-tenancy / orgs.
- Per-seat billing (Stripe's setup here is single-seat).
- Background jobs / queues.
- Storybook.
- Internationalization.
- Provider switching for AI (Vercel AI Gateway IS the abstraction;
  swapping it for direct provider SDKs is left to consumers).
- A `create-agenticbuilder` npm CLI.
- The onboarding skill itself (deferred to Plan C).

## 6. Risks / open questions

- **Stripe webhook signing on local dev:** Local dev requires `stripe
  listen --forward-to localhost:3000/api/stripe/webhook` to get a
  real-time signing secret. The README must document this; otherwise
  webhook verification fails locally. Mitigation: install README's
  *Verify* step prompts the user to start `stripe listen` first.
- **Neon test branch lifecycle in CI:** Creating + deleting branches per
  CI run depends on Neon's API rate limits. Mitigation: cache the
  branch via a stable name (`test-ci-${GITHUB_RUN_ID}`) and let GC
  reap old ones; document fallback to Docker Postgres for self-hosted
  CI.
- **Better-Auth `additionalFields` for `role`:** The exact shape of
  `additionalFields` and whether session refresh propagates a role
  change immediately needs verification during implementation. Plan B
  Task for role-gates will include a manual E2E confirming a role flip
  via `/admin/users` takes effect on the next page load.
- **`requireSession` migration disruption:** role-gates retrofits the
  trunk's session pattern. If a user has built features on top of the
  trunk before installing role-gates, their code may break. The
  install README must include a migration note + a `// FIXME role-gates`
  grep pattern for the trunk's existing `session!` uses.
