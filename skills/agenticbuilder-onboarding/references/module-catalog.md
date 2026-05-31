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
