# Env key sources

For each env key in each module's `env.example`, the dashboard URL
where the user obtains it and the exact name to look for. The skill
walks the user here during STEP 5 sub-step "Walk env keys".

**Maintenance:** When a module adds or renames an env key, update the
corresponding entry below. Keys missing from this file cause the skill
to halt with "no source documented for KEY — see env-key-sources.md".

## Trunk (set up in STEP 3 + STEP 4, before module selection)

### OWNER_EMAIL
- Source: the user's own email.
- Default: `git config user.email`.
- Notes: the owner-bypass key. Whoever owns this email clears every
  role/tier gate; protect it.

### DATABASE_URL
- URL: https://console.neon.tech → your project → "Connection details"
  → "Pooled connection".
- Look for: a string starting with `postgres://` and ending with
  `?sslmode=require`.
- Notes: must be the **pooled** connection for `@neondatabase/serverless`.

### BETTER_AUTH_SECRET
- Source: generated locally with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- Look for: a 64-character hex string. The skill generates this for
  the user.

### BETTER_AUTH_URL
- Source: the URL Better-Auth uses for callback URLs.
- Dev value: `http://localhost:3000`.
- Prod value: your deployed URL (e.g., `https://awesome-saas.vercel.app`).

## stripe

### STRIPE_SECRET_KEY
- URL: https://dashboard.stripe.com/apikeys
- Look for: "Secret key". Starts with `sk_test_` in test mode,
  `sk_live_` in live mode.
- Notes: test keys for local dev; live keys only in production.

### STRIPE_WEBHOOK_SECRET
- URL: https://dashboard.stripe.com/webhooks
- Look for: create a webhook endpoint pointing at
  `<your-domain>/api/stripe/webhook`; the "Signing secret" appears on
  the endpoint's detail page. Starts with `whsec_`.
- Notes: local dev uses `stripe listen --forward-to ...`, which prints
  a separate `whsec_` to stdout — use that for `.env.local`.

### NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- URL: https://dashboard.stripe.com/apikeys
- Look for: "Publishable key". Starts with `pk_test_` or `pk_live_`.
- Notes: shipped to the browser; safe to commit to non-public env files
  but the convention is still `.env.local`.

## ai-sdk

### AI_GATEWAY_API_KEY
- URL: https://vercel.com/dashboard → AI → AI Gateway.
- Look for: "API Key" → "Copy". Starts with `vck_`.
- Notes: one key works across every provider the Gateway routes to.

## blob

### BLOB_READ_WRITE_TOKEN
- URL: https://vercel.com/<team>/<project>/stores
- Look for: create a Blob store; the token appears under the store's
  "Quickstart" tab. Starts with `vercel_blob_rw_`.
- Notes: alternatively, after `vercel link` + `vercel env pull`, this
  key arrives in `.env.local` automatically.

## email-resend

### RESEND_API_KEY
- URL: https://resend.com/api-keys
- Look for: "Create API key" → name it for this project. Starts with
  `re_`.

### RESEND_FROM_EMAIL
- Source: any verified sender on your Resend account.
- URL: https://resend.com/domains → add and verify the domain you'll
  send from, then use any address at that domain.
- Example: `"YourApp <noreply@yourdomain.com>"`.

## vitest

### DATABASE_URL_TEST
- Required for: `npm run test:integration` and the CI integration job.
- URL: https://console.neon.tech → your project → Branches → click
  "New branch", name it `test`, parent = `main` → copy the **pooled**
  connection string.
- Look for: a string starting with `postgres://` and ending with
  `?sslmode=require` — must be a separate branch from `DATABASE_URL`
  so tests can't trash production data.
- Notes: the branch is REUSED across CI runs; integration tests must
  clean up via transactional rollback (`withRolledBackTx` from
  `src/test/db.ts` does this).
- **Not needed for local unit tests** (`npm run test:unit`). Only
  needed for `npm run test:integration` or the CI `integration` /
  `e2e` jobs.

## role-gates
No env keys. (Uses `OWNER_EMAIL` from the trunk.)

## admin-scaffold
No env keys. (Inherits from `role-gates`.)
