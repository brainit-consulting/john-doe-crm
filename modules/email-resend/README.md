# email-resend

## What this gives you

Transactional email through [Resend](https://resend.com): a `sendEmail()`
helper, three typed email templates (`welcomeEmail`, `verifyEmail`,
`passwordResetEmail`), and Better-Auth hooks wired up so users receive a
real verification email on signup and a real password-reset link from the
`/reset` page. Sign-in is blocked until the user verifies their email
(`requireEmailVerification: true`).

## Prerequisites

- A [Resend](https://resend.com) account with a **verified sending
  domain** (or use Resend's onboarding sandbox domain — limited but works
  for first tests).
- This module assumes the **role-gates** module is already installed
  (composes alongside its `databaseHooks.user.create.before` hook in
  `src/lib/auth/server.ts`). The trunk includes role-gates as of commit
  `1c834ee`.
- **No DB schema changes.** Better-Auth stores verification and
  reset-password tokens in the existing `verification` table from the
  trunk.

## Environment variables

| Key | Required | Where to get it | Example |
|---|---|---|---|
| `RESEND_API_KEY` | yes | Resend Dashboard → API Keys (must start with `re_`) | `re_AbCd1234…` |
| `EMAIL_FROM` | yes | A from-address on a domain verified in your Resend account | `support@yourdomain.com` |

## Install

1. `npm install resend@^4`.

2. Add the two keys to the zod schema in `src/lib/env.ts`:

   ```diff
    const envSchema = z.object({
      DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
      BETTER_AUTH_SECRET: z
        .string()
        .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
      BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
      OWNER_EMAIL: z.string().email("OWNER_EMAIL must be a valid email"),
   +  RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY must start with re_"),
   +  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email address"),
    });
   ```

3. Copy the module's source files into `src/`:

   ```bash
   mkdir -p src/lib/email/templates "src/app/(auth)/reset/[token]"
   cp modules/email-resend/src/lib/email/client.ts src/lib/email/client.ts
   cp modules/email-resend/src/lib/email/send.ts src/lib/email/send.ts
   cp modules/email-resend/src/lib/email/templates/welcome.ts src/lib/email/templates/welcome.ts
   cp modules/email-resend/src/lib/email/templates/verify.ts src/lib/email/templates/verify.ts
   cp modules/email-resend/src/lib/email/templates/password-reset.ts src/lib/email/templates/password-reset.ts
   cp "modules/email-resend/src/app/(auth)/reset/page.tsx" "src/app/(auth)/reset/page.tsx"
   cp "modules/email-resend/src/app/(auth)/reset/[token]/page.tsx" "src/app/(auth)/reset/[token]/page.tsx"
   ```

   Step 3 **overwrites** the trunk's `(auth)/reset/page.tsx` stub. That's
   intentional — the trunk ships a placeholder that explicitly defers to
   this module.

4. Wire up Better-Auth's verification + reset hooks in
   `src/lib/auth/server.ts`. This composes with the role-gates `before`
   hook already present in the trunk:

   ```diff
    export const auth = betterAuth({
      database: drizzleAdapter(db, { provider: "pg" }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      user: {
        additionalFields: {
          role: { type: "string", required: false, defaultValue: "user", input: false },
        },
      },
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 8,
   +    requireEmailVerification: true,
   +    sendResetPassword: async ({ user, url }) => {
   +      const { passwordResetEmail } = await import("@/lib/email/templates/password-reset");
   +      const { sendEmail } = await import("@/lib/email/send");
   +      const { subject, html, text } = passwordResetEmail({ name: user.name, url });
   +      await sendEmail({ to: user.email, subject, html, text });
   +    },
      },
   +  emailVerification: {
   +    sendOnSignUp: true,
   +    sendVerificationEmail: async ({ user, url }) => {
   +      const { verifyEmail } = await import("@/lib/email/templates/verify");
   +      const { sendEmail } = await import("@/lib/email/send");
   +      const { subject, html, text } = verifyEmail({ name: user.name, url });
   +      await sendEmail({ to: user.email, subject, html, text });
   +    },
   +  },
      session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
      },
      databaseHooks: {
        user: {
          create: {
            before: async (data) => {
              if (data.email === env.OWNER_EMAIL) {
                return { data: { ...data, role: "admin" } };
              }
              return { data: { ...data, role: "user" } };
            },
          },
        },
      },
    });
   ```

   Dynamic `await import()` keeps the Resend SDK out of the cold-start
   path for requests that never send email.

5. Append the keys from `modules/email-resend/env.example` to `.env.local`
   (and to `.env.example` for the next contributor). Use a real
   `RESEND_API_KEY` and an `EMAIL_FROM` whose domain is verified in your
   Resend account.

6. No DB migration is needed — Better-Auth's existing `verification`
   table is reused for both verification and reset tokens.

## Verify

1. Start the dev server: `npx next dev -p 3010`.
2. Sign up with a **real** inbox you control (any email other than
   `OWNER_EMAIL`).
3. Within ~10 seconds, a "Confirm your email for AgenticBuilder" email
   arrives. Click the **Verify email** link.
4. In Neon (`db:studio` or SQL), confirm the row in `"user"` for your
   email now has `email_verified = true`.
5. Sign out. Visit `/reset`. Enter the same email. Submit the form. A
   "Reset your AgenticBuilder password" email arrives within ~10s.
6. Click the **Set a new password** link. You land on
   `/reset/new?token=<token>`. Enter a new password (≥ 8 chars), confirm
   it, submit. You're redirected to `/login`.
7. Sign in with the new password. Success.
8. `npm run typecheck && npm run lint && npm test && npm run build` all
   pass.

If verification emails don't arrive: check Resend dashboard for the
delivery log, confirm `EMAIL_FROM`'s domain is verified, and inspect the
dev-server console for any thrown errors from `sendEmail()`.

## Known limitations

- **Resend sandbox addresses.** Resend's free-tier API keys only deliver
  to email addresses on a verified domain. If `EMAIL_FROM` is set to a
  verified domain but the recipient is on a different domain, the call
  succeeds silently from your code's perspective but Resend bounces or
  drops the message. Combined with `requireEmailVerification: true`,
  this silently rolls back signups for arbitrary email addresses
  during testing. Workarounds:
  - Use addresses on the verified domain for testing.
  - Temporarily flip `requireEmailVerification` to `false` in
    `src/lib/auth/server.ts` while developing.
  - Manually set `email_verified = true` in the DB for test accounts
    via Neon Console or `mcp__plugin_neon_neon__run_sql`.
- **Session staleness on email change.** Better-Auth caches session
  data; an email change applied via SQL won't show up in an active
  session until the next `updateAge` cycle. Sign out + sign in to
  refresh.

## Uninstall

1. Remove the copied source files:

   ```bash
   rm -rf src/lib/email "src/app/(auth)/reset/[token]"
   ```

2. Restore the `(auth)/reset/page.tsx` stub from the trunk (the original
   content lives in commit history at the trunk baseline).

3. Reverse the diff in `src/lib/env.ts` — delete the `RESEND_API_KEY`
   and `EMAIL_FROM` lines from the zod schema.

4. Reverse the diff in `src/lib/auth/server.ts` — delete the
   `requireEmailVerification`, `sendResetPassword`, and
   `emailVerification` config blocks.

5. Remove `RESEND_API_KEY` and `EMAIL_FROM` from `.env.local` and
   `.env.example`.

6. `npm uninstall resend`.

7. No DB rollback is needed — the `verification` table is unchanged by
   this module.
