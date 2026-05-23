# AgenticBuilder Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the seven opt-in modules under `modules/<name>/` so a fresh trunk clone can install them by following each README. Each module conforms to the shelf contract (six H2 sections, `deps.json`, `env.example`, `src/`, optional `migrations/`). Plan ends with `v0.2.0` tagged on a trunk that has all modules available (but uninstalled by default).

**Architecture:** Each module is self-contained under `modules/<name>/`. The plan executes one module per task in the documented install order, applying its install steps onto the working trunk in the same task so the *Verify* step can run end-to-end against the live Neon DB. After each module is in, trunk + that module installed must pass typecheck / lint / test / build.

**Tech Stack additions per module:**

- `role-gates` — no new deps; touches `src/lib/db/schema.ts`, `auth/server.ts`.
- `stripe` — `stripe` 22.1.1 (already in trunk deps from cashdash snapshot — verify).
- `email-resend` — `resend` (latest 4.x).
- `ai-sdk` — `ai` 6.0.185 (already in trunk via cashdash snapshot), `@ai-sdk/openai-compatible` (gateway).
- `blob` — `@vercel/blob` 2.4.0 (already in trunk snapshot).
- `vitest` — `@playwright/test`, `@neondatabase/api-client` (optional), no new test runner deps (trunk has vitest).
- `admin-scaffold` — no new deps.

> **Note re: trunk pins:** the trunk's `package.json` already pins `stripe`, `@vercel/blob`, and `ai` (carried over from the cashdash snapshot per spec §1 versions table). These pins live in trunk's `dependencies` but the actual import-and-use happens only when the relevant module is installed. Each module's `deps.json` lists ONLY the additions specific to it (e.g., `resend` for email-resend, `@playwright/test` for vitest).

**Scope split:**
- **This plan (Plan B):** Implements all seven modules. End state: trunk + each module artifact under `modules/<name>/`; the Plan B execution itself walks the install on the trunk so we can E2E-verify each module, then either keeps or rolls back the install before committing (`modules/<name>/` is what ships; the trunk install is a verification fixture).
- **Future Plan C:** Onboarding skill (separate spec).
- **Out of scope:** Multi-tenancy, per-seat billing, queues, Storybook (spec §5).

**Pre-flight:**
- Trunk at `v0.1.0` is the starting state (commit `023ce83` or later).
- Neon DB `agenticbuilder-db` is provisioned and migrated.
- `.env.local` exists with all trunk env vars set.
- Each module's external service account (Stripe test, Resend, Vercel AI Gateway, Vercel Blob) needs an API key OR documentation to skip Verify when absent.
- A Stripe CLI install is required for the `stripe` module's local-dev webhook forwarding.

**Verification fixture vs ship state:**
Each module Task implements both:
  (a) the `modules/<name>/` artifact that SHIPS in the repo, and
  (b) a *live install* of that module onto the working trunk so the *Verify* step can run.

Because the trunk and the modules co-exist in the same repo, the live install is committed alongside the module artifact. **Trunk + all 7 modules installed becomes the v0.2.0 reference build.** Anyone cloning the template can either:
- Use `git checkout v0.1.0` for a pure trunk (no modules wired in), or
- Use `main` (v0.2.0+) and selectively delete modules they don't want (the onboarding skill in Plan C automates this).

This is a deliberate departure from "trunk = lean baseline, install modules optionally". The simpler reality: showing the modules INSTALLED in the canonical repo is more valuable as a reference than keeping them as cold storage in `modules/`. The README contract still describes a clean install path for downstream users.

---

## Task 1: Branch setup + pre-flight

**Files:**
- No files modified.

- [ ] **Step 1: Confirm trunk state**

```bash
cd h:/AgenticBuilder
git status                          # working tree clean
git describe --tags --abbrev=0      # expects v0.1.0
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all four pass; tag is `v0.1.0`.

- [ ] **Step 2: Confirm Neon DB still healthy**

```bash
npm run db:migrate                  # idempotent; no migrations to apply
```

Expected: "All migrations applied" or "No migrations to apply".

- [ ] **Step 3: Pre-flight external services**

Check that the following are available; if any aren't, note it for the relevant module — Verify will be skipped with a clear marker but the module artifact still ships.

- **Stripe test mode**: `stripe --version` (CLI installed) + you have a Stripe test API key.
- **Resend**: account + verified domain + API key.
- **Vercel AI Gateway**: gateway API key from Vercel dashboard.
- **Vercel Blob**: existing store on the team (we'll use `dreamforge-uploads` per the spec).
- **Neon API key**: required ONLY for the vitest module's CI workflow.

For any missing service, the corresponding module Task will document the skip and proceed with the artifact-only path.

- [ ] **Step 4: Stay on `main`**

This plan continues on `main` (no feature branch). Each module Task commits directly.

No commit yet.

---

## Task 2: `role-gates` module + trunk retrofit

This is the LARGEST single-module task because it retrofits the trunk's
session pattern. Other modules are smaller.

**Files (module artifact):**
- Create: `modules/role-gates/README.md`
- Create: `modules/role-gates/deps.json`
- Create: `modules/role-gates/env.example`
- Create: `modules/role-gates/src/lib/auth/roles.ts`
- Create: `modules/role-gates/src/components/auth/RequireRole.tsx`

**Files (trunk patches applied by this task):**
- Modify: `src/lib/db/schema.ts` — add `role` column to `user`.
- Modify: `src/lib/auth/server.ts` — add `additionalFields.user.role`; on signup, set `role='admin'` if email matches `OWNER_EMAIL`.
- Create: `src/lib/auth/roles.ts` (copy from module).
- Create: `src/components/auth/RequireRole.tsx` (copy from module).
- Modify: `src/app/(app)/layout.tsx` — replace inline session check with `requireSession()`.
- Modify: `src/app/(app)/dashboard/page.tsx` — same.
- Modify: `src/app/(app)/notes/page.tsx` — same.
- Modify: `src/app/(app)/notes/[id]/page.tsx` — same.
- Modify: `src/app/(app)/notes/_actions.ts` — `requireUserId` → `requireSession`.
- Run: `npm run db:generate && npm run db:migrate`.

- [ ] **Step 1: Create `modules/role-gates/deps.json`**

```json
{
  "dependencies": {},
  "devDependencies": {}
}
```

- [ ] **Step 2: Create `modules/role-gates/env.example`**

```bash
# role-gates relies on OWNER_EMAIL (already in trunk's .env.example).
# No new env vars are required.
```

- [ ] **Step 3: Create `modules/role-gates/src/lib/auth/roles.ts`**

```ts
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { env } from "@/lib/env";

export type Role = "user" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AppSession = {
  user: SessionUser;
};

export async function getSession(): Promise<AppSession | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  return {
    user: {
      id: s.user.id,
      email: s.user.email,
      name: s.user.name,
      role: ((s.user as { role?: Role }).role ?? "user") as Role,
    },
  };
}

export async function requireSession(): Promise<AppSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export function isOwner(email: string): boolean {
  return email === env.OWNER_EMAIL;
}

export function effectiveRole(session: AppSession): Role {
  if (isOwner(session.user.email)) return "admin";
  return session.user.role;
}

export async function requireRole(role: Role): Promise<AppSession> {
  const s = await requireSession();
  if (effectiveRole(s) !== role && effectiveRole(s) !== "admin") {
    redirect("/dashboard");
  }
  return s;
}
```

- [ ] **Step 4: Create `modules/role-gates/src/components/auth/RequireRole.tsx`**

```tsx
"use client";

import { useSession } from "@/lib/auth/client";
import type { ReactNode } from "react";

type Role = "user" | "admin";

export function RequireRole({
  role,
  children,
  fallback = null,
}: {
  role: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data: session } = useSession();
  if (!session) return fallback;
  // OWNER_EMAIL bypass: the server has already set role='admin' on signup
  // for the owner; client-side we just trust session.user.role.
  const userRole = ((session.user as { role?: Role }).role ?? "user") as Role;
  if (role === "admin" && userRole !== "admin") return fallback;
  return <>{children}</>;
}
```

- [ ] **Step 5: Create `modules/role-gates/README.md`**

Use this content verbatim:

````markdown
# role-gates

## What this gives you

Adds a `role` column to the `user` table (`'user' | 'admin'`, default `'user'`), a server-side `requireRole(role)` helper, a `<RequireRole>` client gate, and an unconditional `OWNER_EMAIL` bypass for every gate. Also replaces the trunk's `session!.user.id` non-null assertions with a typed `requireSession()` helper.

## Prerequisites

- Trunk only. No other modules required.

## Environment variables

| Key | Required | Where to get it | Example |
|---|---|---|---|
| `OWNER_EMAIL` | yes | Already in trunk; the email that bypasses every gate | `you@example.com` |

## Install

1. `npm install` (no new packages; `deps.json` is empty).
2. Copy `modules/role-gates/src/lib/auth/roles.ts` → `src/lib/auth/roles.ts`.
3. Copy `modules/role-gates/src/components/auth/RequireRole.tsx` → `src/components/auth/RequireRole.tsx`.
4. Add `role` column to `user` in `src/lib/db/schema.ts`:

   ```diff
    export const user = pgTable("user", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      email: text("email").notNull().unique(),
      emailVerified: boolean("email_verified").notNull().default(false),
      image: text("image"),
   +  role: text("role").notNull().default("user"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow(),
    });
   ```

5. In `src/lib/auth/server.ts`, expose `role` on the session user and auto-promote `OWNER_EMAIL` at signup:

   ```diff
    import { betterAuth } from "better-auth";
    import { drizzleAdapter } from "better-auth/adapters/drizzle";
    import { db } from "@/lib/db/client";
    import { env } from "@/lib/env";

    export const auth = betterAuth({
      database: drizzleAdapter(db, { provider: "pg" }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
   +  user: {
   +    additionalFields: {
   +      role: { type: "string", required: true, defaultValue: "user" },
   +    },
   +  },
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 8,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
      },
   +  databaseHooks: {
   +    user: {
   +      create: {
   +        before: async (data) => {
   +          if (data.email === env.OWNER_EMAIL) {
   +            return { data: { ...data, role: "admin" } };
   +          }
   +          return { data };
   +        },
   +      },
   +    },
   +  },
    });

    export type Auth = typeof auth;
   ```

6. Retrofit trunk files to use `requireSession()`. In `src/app/(app)/layout.tsx`:

   ```diff
   -import { redirect } from "next/navigation";
   -import { headers } from "next/headers";
   -import { auth } from "@/lib/auth/server";
   +import { requireSession } from "@/lib/auth/roles";
    import { Navbar } from "./_components/Navbar";

    export default async function AppLayout({ children }: { children: React.ReactNode }) {
   -  const session = await auth.api.getSession({ headers: await headers() });
   -  if (!session) {
   -    redirect("/login");
   -  }
   +  const session = await requireSession();
      return (
        <>
          <Navbar userName={session.user.name} />
   ```

7. In `src/app/(app)/dashboard/page.tsx`:

   ```diff
   -import { headers } from "next/headers";
   -import { auth } from "@/lib/auth/server";
   +import { requireSession } from "@/lib/auth/roles";

    export default async function DashboardPage() {
   -  const session = await auth.api.getSession({ headers: await headers() });
   -  const userName = session?.user.name ?? "there";
   +  const session = await requireSession();
   +  const userName = session.user.name;
   ```

8. In `src/app/(app)/notes/page.tsx`:

   ```diff
   -import { headers } from "next/headers";
   -import { auth } from "@/lib/auth/server";
   +import { requireSession } from "@/lib/auth/roles";

    export default async function NotesPage() {
   -  const session = await auth.api.getSession({ headers: await headers() });
   -  const userId = session!.user.id;
   +  const session = await requireSession();
   +  const userId = session.user.id;
   ```

9. In `src/app/(app)/notes/[id]/page.tsx`:

   ```diff
   -import { headers } from "next/headers";
   -import { auth } from "@/lib/auth/server";
   +import { requireSession } from "@/lib/auth/roles";

    export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
      const { id } = await params;
   -  const session = await auth.api.getSession({ headers: await headers() });
   -  const note = await getNoteForUser(id, session!.user.id);
   +  const session = await requireSession();
   +  const note = await getNoteForUser(id, session.user.id);
   ```

10. In `src/app/(app)/notes/_actions.ts`, replace the local `requireUserId` helper with `requireSession`:

    ```diff
    -import { headers } from "next/headers";
     import { redirect } from "next/navigation";
     import { revalidatePath } from "next/cache";
     import { nanoid } from "nanoid";
    -import { auth } from "@/lib/auth/server";
    +import { requireSession } from "@/lib/auth/roles";
     import {
       createNote,
       updateNoteForUser,
       deleteNoteForUser,
     } from "@/lib/db/queries";
     import { noteInputSchema } from "./_schema";

    -async function requireUserId(): Promise<string> {
    -  const session = await auth.api.getSession({ headers: await headers() });
    -  if (!session) {
    -    redirect("/login");
    -  }
    -  return session.user.id;
    -}
    +async function requireUserId(): Promise<string> {
    +  const session = await requireSession();
    +  return session.user.id;
    +}
    ```

11. Run `npm run db:generate && npm run db:migrate`.

## Verify

1. Sign up a fresh user (NOT `OWNER_EMAIL`) → in `db:studio`, confirm `user.role = 'user'`.
2. Sign up with `OWNER_EMAIL` → confirm `user.role = 'admin'`.
3. From a `requireRole("admin")`-gated route as a non-admin → redirected to `/dashboard`. (Demo: the admin-scaffold module exercises this; without it, you can manually add a test route.)
4. `npm run typecheck && npm run lint && npm test && npm run build` all pass.

## Uninstall

1. Remove `src/lib/auth/roles.ts` and `src/components/auth/RequireRole.tsx`.
2. Reverse the diffs in `src/lib/db/schema.ts`, `src/lib/auth/server.ts`, and the five pages/actions retrofitted.
3. Run `npm run db:generate && npm run db:migrate` (drop `role` column).
````

- [ ] **Step 6: Apply the install to the trunk (the live verification fixture)**

Follow Steps 1–11 from the README above against the working trunk. Use the Edit tool for each diff. Make sure to copy the helper files into `src/lib/auth/roles.ts` and `src/components/auth/RequireRole.tsx`.

- [ ] **Step 7: Run schema migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: a new migration file under `drizzle/migrations/` adding the `role` column. Migration applies cleanly.

- [ ] **Step 8: Verify (full automated checks)**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all four pass.

- [ ] **Step 9: Verify (live browser E2E)**

Start the dev server (`npx next dev -p 3010`), then verify:
1. Existing user (signed up in Task 17 of trunk plan) still works after migration — sign in, see notes.
2. In `db:studio`, confirm existing user has `role='user'`. Manually set the existing user's role to `'admin'` (the OWNER_EMAIL signup hook only runs on new signups; existing users keep their default). Verify next session reflects the change after sign-out + sign-in.
3. `OWNER_EMAIL` bypass: confirmed at code level by inspecting `effectiveRole`. Live bypass test happens in admin-scaffold module (Task 8).

If the live browser check is blocked (e.g., no dev server), document and proceed; the automated checks gate the commit.

- [ ] **Step 10: Commit**

```bash
git add modules/role-gates/ \
        src/lib/auth/roles.ts \
        src/components/auth/RequireRole.tsx \
        src/lib/db/schema.ts \
        src/lib/auth/server.ts \
        "src/app/(app)/layout.tsx" \
        "src/app/(app)/dashboard/page.tsx" \
        "src/app/(app)/notes/page.tsx" \
        "src/app/(app)/notes/[id]/page.tsx" \
        "src/app/(app)/notes/_actions.ts" \
        drizzle/
git commit -m "feat(role-gates): module artifact + trunk retrofit (role column, requireSession, OWNER_EMAIL bypass)"
```

---

## Task 3: `stripe` module

**Files (module artifact):**
- Create: `modules/stripe/README.md`
- Create: `modules/stripe/deps.json`
- Create: `modules/stripe/env.example`
- Create: `modules/stripe/src/lib/stripe/server.ts`
- Create: `modules/stripe/src/lib/stripe/plans.ts`
- Create: `modules/stripe/src/lib/db/subscription-schema.ts` (delta; install README inlines the diff into `db/schema.ts`)
- Create: `modules/stripe/src/lib/db/subscription-queries.ts` (delta; install README inlines into `db/queries.ts`)
- Create: `modules/stripe/src/app/api/stripe/checkout/route.ts`
- Create: `modules/stripe/src/app/api/stripe/portal/route.ts`
- Create: `modules/stripe/src/app/api/stripe/webhook/route.ts`
- Create: `modules/stripe/src/app/(app)/billing/page.tsx`
- Create: `modules/stripe/src/app/(app)/billing/_components/PlanCard.tsx`

**Files (trunk patches applied):**
- Modify: `src/lib/env.ts` — add Stripe keys.
- Modify: `src/lib/db/schema.ts` — add `subscription` table.
- Modify: `src/lib/db/queries.ts` — add subscription query helpers.
- Modify: `src/lib/auth/server.ts` — on `user.create.after`, create Stripe customer + free-tier subscription row.
- Copy: module src/* into project src/.
- Run: `npm run db:generate && npm run db:migrate`.

- [ ] **Step 1: Create `modules/stripe/deps.json`**

```json
{
  "dependencies": {
    "stripe": "22.1.1"
  },
  "devDependencies": {}
}
```

(`stripe` is already in trunk's `package.json` from the cashdash snapshot, so `npm install` is a no-op. The `deps.json` documents the module's stated requirement.)

- [ ] **Step 2: Create `modules/stripe/env.example`**

```bash
# Stripe test-mode keys for dev (https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY="sk_test_…"
STRIPE_WEBHOOK_SECRET="whsec_…"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_…"

# Price IDs from Stripe Products (https://dashboard.stripe.com/test/products)
STRIPE_PRICE_PRO="price_…"
STRIPE_PRICE_TEAM="price_…"
```

- [ ] **Step 3: Create `modules/stripe/src/lib/stripe/server.ts`**

```ts
import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-10-28.acacia",
  typescript: true,
});
```

- [ ] **Step 4: Create `modules/stripe/src/lib/stripe/plans.ts`**

```ts
import { env } from "@/lib/env";

export type PlanId = "free" | "pro" | "team";

export interface Plan {
  id: PlanId;
  name: string;
  priceId: string | null;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceId: null,
    features: ["10 notes", "Basic features"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceId: env.STRIPE_PRICE_PRO,
    features: ["Unlimited notes", "Priority support", "All features"],
  },
  team: {
    id: "team",
    name: "Team",
    priceId: env.STRIPE_PRICE_TEAM,
    features: ["Everything in Pro", "Multiple users", "Audit logs"],
  },
};

export function planFromPriceId(priceId: string): PlanId {
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === env.STRIPE_PRICE_TEAM) return "team";
  return "free";
}
```

- [ ] **Step 5: Create `modules/stripe/src/app/api/stripe/checkout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { PLANS, type PlanId } from "@/lib/stripe/plans";
import { requireSession } from "@/lib/auth/roles";
import { getSubscriptionForUser } from "@/lib/db/queries";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const session = await requireSession();
  const { plan } = (await req.json()) as { plan: PlanId };

  const planConfig = PLANS[plan];
  if (!planConfig || !planConfig.priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const subscription = await getSubscriptionForUser(session.user.id);
  const customerId = subscription?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${env.BETTER_AUTH_URL}/billing?status=success`,
    cancel_url: `${env.BETTER_AUTH_URL}/billing?status=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

- [ ] **Step 6: Create `modules/stripe/src/app/api/stripe/portal/route.ts`**

```ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { requireSession } from "@/lib/auth/roles";
import { getSubscriptionForUser } from "@/lib/db/queries";
import { env } from "@/lib/env";

export async function POST() {
  const session = await requireSession();
  const subscription = await getSubscriptionForUser(session.user.id);
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${env.BETTER_AUTH_URL}/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
```

- [ ] **Step 7: Create `modules/stripe/src/app/api/stripe/webhook/route.ts`**

```ts
import { NextResponse } from "next/server";
import type { Stripe } from "stripe";
import { stripe } from "@/lib/stripe/server";
import { env } from "@/lib/env";
import { setSubscriptionStatus, upsertSubscription } from "@/lib/db/queries";
import { planFromPriceId } from "@/lib/stripe/plans";

export const runtime = "nodejs"; // raw body required for signature verification

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      if (!session.subscription) break;
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      await upsertSubscription({
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        plan: planFromPriceId(sub.items.data[0]!.price.id),
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await setSubscriptionStatus(sub.id, {
        plan: event.type === "customer.subscription.deleted" ? "free" : planFromPriceId(sub.items.data[0]!.price.id),
        status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 8: Create `modules/stripe/src/app/(app)/billing/_components/PlanCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import type { Plan } from "@/lib/stripe/plans";

export function PlanCard({ plan, current, recommended }: { plan: Plan; current: boolean; recommended?: boolean }) {
  const [pending, setPending] = useState(false);

  async function handleUpgrade() {
    setPending(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: plan.id }),
    });
    const { url, error } = await res.json();
    if (error) {
      alert(error);
      setPending(false);
      return;
    }
    window.location.href = url;
  }

  return (
    <Card className={recommended ? "border-neutral-900 dark:border-white" : ""}>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.features.join(" · ")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          {plan.features.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {current ? (
          <Button variant="secondary" disabled>Current plan</Button>
        ) : plan.id === "free" ? (
          <Button variant="ghost" disabled>Downgrade via portal</Button>
        ) : (
          <Button disabled={pending} onClick={handleUpgrade}>
            {pending ? "Loading…" : `Upgrade to ${plan.name}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 9: Create `modules/stripe/src/app/(app)/billing/page.tsx`**

```tsx
import { requireSession } from "@/lib/auth/roles";
import { getSubscriptionForUser } from "@/lib/db/queries";
import { PLANS } from "@/lib/stripe/plans";
import { PlanCard } from "./_components/PlanCard";
import { Button } from "@/components/ui/button";

export default async function BillingPage() {
  const session = await requireSession();
  const subscription = await getSubscriptionForUser(session.user.id);
  const currentPlan = subscription?.plan ?? "free";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Current plan: <strong>{PLANS[currentPlan].name}</strong>
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={currentPlan === plan.id}
            recommended={plan.id === "pro"}
          />
        ))}
      </div>
      {subscription?.stripeCustomerId && (
        <form action="/api/stripe/portal" method="post">
          <Button type="submit" variant="secondary">Manage billing in Stripe</Button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Create `modules/stripe/README.md`**

Use the full content of the README following the standard six H2 sections. Document all install diffs verbatim (env keys, schema delta for `subscription` table, query helpers, auth/server.ts `user.create.after` hook). Reference Step 11 (trunk apply) for the full diffs — see code blocks in the next sub-step.

(For brevity in this plan document, the README content is described in the spec at §2.1. The implementer should write the README following the trunk's `notes` README style + the six-section contract from `modules/README.md`.)

- [ ] **Step 11: Apply the install onto the trunk**

11a. Add to `src/lib/env.ts` zod schema:

```diff
 const envSchema = z.object({
   DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
   BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
   BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
   OWNER_EMAIL: z.string().email("OWNER_EMAIL must be a valid email"),
+  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_"),
+  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_"),
+  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_"),
+  STRIPE_PRICE_PRO: z.string().startsWith("price_", "STRIPE_PRICE_PRO must start with price_"),
+  STRIPE_PRICE_TEAM: z.string().startsWith("price_", "STRIPE_PRICE_TEAM must start with price_"),
 });
```

11b. Add to `src/lib/db/schema.ts`:

```ts
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Subscription = typeof subscription.$inferSelect;
```

Also extend `userRelations`:

```diff
 export const userRelations = relations(user, ({ many, one }) => ({
   notes: many(notes),
+  subscription: one(subscription, { fields: [user.id], references: [subscription.userId] }),
 }));
```

11c. Add to `src/lib/db/queries.ts`:

```ts
import { subscription, type Subscription } from "./schema";

export async function getSubscriptionForUser(userId: string): Promise<Subscription | undefined> {
  const rows = await db.select().from(subscription).where(eq(subscription.userId, userId)).limit(1);
  return rows[0];
}

export async function createSubscriptionForUser(input: {
  id: string;
  userId: string;
  stripeCustomerId: string;
}): Promise<Subscription> {
  const [row] = await db.insert(subscription).values({ ...input, plan: "free", status: "active" }).returning();
  return row;
}

export async function upsertSubscription(input: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: string;
  status: string;
  currentPeriodEnd: Date;
}): Promise<void> {
  await db.update(subscription)
    .set({
      stripeSubscriptionId: input.stripeSubscriptionId,
      plan: input.plan,
      status: input.status,
      currentPeriodEnd: input.currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeCustomerId, input.stripeCustomerId));
}

export async function setSubscriptionStatus(
  stripeSubscriptionId: string,
  patch: { plan: string; status: string; currentPeriodEnd: Date },
): Promise<void> {
  await db.update(subscription)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId));
}
```

11d. Patch `src/lib/auth/server.ts`'s `databaseHooks.user.create` to ALSO create a Stripe customer + free-tier subscription row after the role assignment runs. This composes with the role-gates patch from Task 2:

```diff
   databaseHooks: {
     user: {
       create: {
         before: async (data) => {
           if (data.email === env.OWNER_EMAIL) {
             return { data: { ...data, role: "admin" } };
           }
           return { data };
         },
+        after: async (user) => {
+          const { stripe } = await import("@/lib/stripe/server");
+          const { createSubscriptionForUser } = await import("@/lib/db/queries");
+          const { nanoid } = await import("nanoid");
+          const customer = await stripe.customers.create({
+            email: user.email,
+            name: user.name,
+            metadata: { userId: user.id },
+          });
+          await createSubscriptionForUser({
+            id: nanoid(),
+            userId: user.id,
+            stripeCustomerId: customer.id,
+          });
+        },
       },
     },
   },
```

11e. Copy module src/* into project src/:

```bash
mkdir -p src/lib/stripe "src/app/api/stripe/checkout" "src/app/api/stripe/portal" "src/app/api/stripe/webhook" "src/app/(app)/billing/_components"
cp modules/stripe/src/lib/stripe/server.ts src/lib/stripe/server.ts
cp modules/stripe/src/lib/stripe/plans.ts src/lib/stripe/plans.ts
cp modules/stripe/src/app/api/stripe/checkout/route.ts "src/app/api/stripe/checkout/route.ts"
cp modules/stripe/src/app/api/stripe/portal/route.ts "src/app/api/stripe/portal/route.ts"
cp modules/stripe/src/app/api/stripe/webhook/route.ts "src/app/api/stripe/webhook/route.ts"
cp "modules/stripe/src/app/(app)/billing/page.tsx" "src/app/(app)/billing/page.tsx"
cp "modules/stripe/src/app/(app)/billing/_components/PlanCard.tsx" "src/app/(app)/billing/_components/PlanCard.tsx"
```

11f. Run migrations:

```bash
npm run db:generate
npm run db:migrate
```

11g. Add Stripe env vars to `.env.local` (paste real test-mode values).

- [ ] **Step 12: Provision Stripe test products**

In Stripe test dashboard:
1. Create three Products: Free (no price), Pro (recurring monthly, e.g. $20), Team (recurring monthly, e.g. $50).
2. Copy Pro and Team price IDs into `.env.local` as `STRIPE_PRICE_PRO` and `STRIPE_PRICE_TEAM`.
3. Get a webhook endpoint signing secret:
   - For local dev: `stripe listen --forward-to localhost:3010/api/stripe/webhook`. The CLI prints `whsec_…` — set this as `STRIPE_WEBHOOK_SECRET` in `.env.local`.
   - For production: create an endpoint in the Stripe dashboard pointing at your deployed URL; copy the signing secret.

If Stripe CLI is unavailable, skip the live Verify (Step 14) and document.

- [ ] **Step 13: Verify (automated)**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all four pass.

- [ ] **Step 14: Verify (live E2E, requires Stripe CLI)**

In one terminal: `stripe listen --forward-to localhost:3010/api/stripe/webhook` (keep running).
In another terminal: `npx next dev -p 3010`.

Sign up as a new user. Visit `/billing`. Click "Upgrade to Pro". Use test card `4242 4242 4242 4242` with any future expiry and any CVC. Complete checkout. Stripe redirects back to `/billing?status=success`. The `stripe listen` terminal shows webhook delivery. Reload `/billing` — "Current plan: Pro" is shown, "Manage billing in Stripe" button is visible. Click it → redirected to Customer Portal. Cancel subscription in portal. Return to `/billing` — current plan reverts to "Free" within ~5s.

If any step fails, document and pause for diagnosis before commit.

- [ ] **Step 15: Commit**

```bash
git add modules/stripe/ \
        src/lib/stripe/ \
        src/lib/env.ts \
        src/lib/db/schema.ts \
        src/lib/db/queries.ts \
        src/lib/auth/server.ts \
        "src/app/api/stripe/" \
        "src/app/(app)/billing/" \
        drizzle/
git commit -m "feat(stripe): module artifact + trunk install (Checkout + Customer Portal + webhook)"
```

---

## Task 4: `email-resend` module

Mirrors the pattern of Task 3 but for transactional email + a real password-reset flow.

**Files (module artifact):** `modules/email-resend/` with README, deps.json, env.example, src/{lib/email,app/(auth)/reset}. Specifically:
- `src/lib/email/client.ts`
- `src/lib/email/templates/welcome.ts`, `verify.ts`, `password-reset.ts`
- `src/app/(auth)/reset/page.tsx` (replaces trunk stub)
- `src/app/(auth)/reset/[token]/page.tsx` (new)

**Patches:**
- `src/lib/env.ts` — `RESEND_API_KEY`, `EMAIL_FROM`.
- `src/lib/auth/server.ts` — enable `emailVerification` + `sendVerificationEmail` + `sendResetPassword` hooks.

The implementer writes verbatim file content for each, mirroring Task 3's structure (env zod additions, copy operations, README diffs). Reference spec §2.4 for design intent. **No DB schema changes** — Better-Auth handles verification tokens in the `verification` table that already exists.

- [ ] **Step 1: `deps.json`** — adds `"resend": "^4"`.
- [ ] **Step 2: `env.example`** — `RESEND_API_KEY=…` + `EMAIL_FROM=no-reply@yourdomain.com`.
- [ ] **Step 3–8: Email helpers + templates.**
- [ ] **Step 9: Reset pages (replaces stub).**
- [ ] **Step 10: README following the contract.**
- [ ] **Step 11: Trunk patches** — env.ts, auth/server.ts, copy files, npm install resend.
- [ ] **Step 12: Verify** — sign up with a real email; verification email arrives; click link; email_verified=true in DB. Use `/reset` flow end-to-end with a real reset token.
- [ ] **Step 13: Automated checks pass.**
- [ ] **Step 14: Commit.**

**Commit message:** `feat(email-resend): module artifact + trunk install (Resend, verification, real password reset)`.

(The implementer expands each step inline during execution. The pattern is established by Task 2 and Task 3.)

---

## Task 5: `ai-sdk` module

**Files (module artifact):** `modules/ai-sdk/` with README, deps.json, env.example, src/{lib/ai,app/api/chat,app/(app)/chat}. Default model Claude Sonnet 4.6 via Vercel AI Gateway.

**Patches:**
- `src/lib/env.ts` — `AI_GATEWAY_API_KEY`.
- Navbar — add "Chat" link.

- [ ] **Step 1: `deps.json`** — adds `"ai": "6.0.185"` (already in trunk; no-op install).
- [ ] **Step 2: `env.example`** — `AI_GATEWAY_API_KEY=…`.
- [ ] **Step 3: `src/lib/ai/models.ts`** — array of supported `{ id, name, provider }` (Sonnet 4.6 default; Opus 4.7, GPT-5, Gemini 2.5).
- [ ] **Step 4: `src/lib/ai/gateway.ts`** — provider wrapping `ai`'s gateway.
- [ ] **Step 5: `src/app/api/chat/route.ts`** — streaming POST using `streamText`.
- [ ] **Step 6: `src/app/(app)/chat/page.tsx`** — RSC wrapper.
- [ ] **Step 7: `src/app/(app)/chat/_components/ChatUI.tsx`** — `useChat()` client component with model picker.
- [ ] **Step 8: README following the contract.**
- [ ] **Step 9: Trunk patches** — env.ts, navbar diff (Chat link).
- [ ] **Step 10: Verify** — visit `/chat`, send a message, response streams in under 5s, switch model in picker, next response uses new model.
- [ ] **Step 11: Automated checks pass.**
- [ ] **Step 12: Commit** — `feat(ai-sdk): module artifact + trunk install (AI Gateway streaming chat with model picker)`.

---

## Task 6: `blob` module

**Files (module artifact):** `modules/blob/` with README, deps.json, env.example, src/{lib/blob.ts, app/api/upload/route.ts, app/(app)/_components/FileUpload.tsx, app/(app)/notes/[id]/_components/Attachments.tsx}.

**Patches:**
- `src/lib/env.ts` — `BLOB_READ_WRITE_TOKEN`.
- `src/lib/db/schema.ts` — `attachment` table.
- `src/lib/db/queries.ts` — attachment query helpers.
- `src/app/(app)/notes/[id]/page.tsx` — render `<Attachments noteId={note.id} />` below the form.

- [ ] **Step 1: `deps.json`** — `"@vercel/blob": "2.4.0"` (already in trunk pins).
- [ ] **Step 2: `env.example`** — `BLOB_READ_WRITE_TOKEN=…` with explicit note: "ANY existing Vercel Blob store on your team is fine; uploads namespace under `agenticbuilder/<userId>/<filename>` to coexist with other projects sharing the store. Get the token from Storage → Blob → Read/Write token."
- [ ] **Step 3: `src/lib/blob.ts`** — wraps `@vercel/blob`'s put/del/list with namespace enforcement.
- [ ] **Step 4: `src/app/api/upload/route.ts`** — POST returns signed upload URL; gated by `requireSession`.
- [ ] **Step 5: `src/app/(app)/_components/FileUpload.tsx`** — client drag-drop component with progress.
- [ ] **Step 6: `src/app/(app)/notes/[id]/_components/Attachments.tsx`** — list + uploader.
- [ ] **Step 7: README following the contract; explicitly call out the shared-store reuse pattern.**
- [ ] **Step 8: Trunk patches** — env.ts, db/schema, db/queries, notes/[id]/page.tsx.
- [ ] **Step 9: Migrations** — `npm run db:generate && npm run db:migrate`.
- [ ] **Step 10: Provision token from `dreamforge-uploads`** — `vercel blob list-stores --all` to find the store ID; pull token via Vercel dashboard. Add to `.env.local`.
- [ ] **Step 11: Verify** — open a note, drag-drop a small file, upload progress shows, file appears in attachments. Re-open note: attachment persists. Click → opens at Blob URL. In `dreamforge-uploads` dashboard, the file path begins with `agenticbuilder/<userId>/...` confirming namespace isolation.
- [ ] **Step 12: Automated checks pass.**
- [ ] **Step 13: Commit** — `feat(blob): module artifact + trunk install (signed-URL uploads + attachment table; reuses any existing Blob store)`.

---

## Task 7: `vitest` module — expanded testing scaffold

**Files (module artifact):** `modules/vitest/` with README, deps.json, env.example, src/{test/db.ts, test/factories/, test/example.integration.test.ts}, playwright.config.ts, e2e/auth.spec.ts, `.github/workflows/test.yml`.

**Patches:**
- `vitest.config.ts` — add `integration` test project alongside `unit`.
- `package.json` — add scripts: `test:integration`, `test:e2e`.

- [ ] **Step 1: `deps.json`** — `@playwright/test`, optionally `@neondatabase/api-client` for CI branch management.
- [ ] **Step 2: `env.example`** — `DATABASE_URL_TEST` (separate Neon branch URL), `NEON_API_KEY` (CI only).
- [ ] **Step 3: `vitest.config.ts` updated** — splits into `unit` (existing) and `integration` projects; integration uses `DATABASE_URL_TEST`.
- [ ] **Step 4: `src/test/db.ts`** — transactional helper for per-test isolation.
- [ ] **Step 5: `src/test/factories/index.ts`** — `makeUser`, `makeNote`.
- [ ] **Step 6: `src/test/example.integration.test.ts`** — sample integration test (create user + 2 notes, assert query returns them, transaction rolls back).
- [ ] **Step 7: `playwright.config.ts`** — config for Chromium + mobile project.
- [ ] **Step 8: `e2e/auth.spec.ts`** — automated version of the Task 17 manual E2E (signup → notes CRUD → signout → proxy gate).
- [ ] **Step 9: `.github/workflows/test.yml`** — three-job workflow (unit, integration with Neon branch, e2e).
- [ ] **Step 10: README following the contract; documents Docker fallback for self-hosted CI.**
- [ ] **Step 11: Provision Neon test branch** — `neon branches create test --parent main` (via Neon CLI) or via dashboard; copy connection URL to `.env.test`.
- [ ] **Step 12: Trunk patches applied** — `vitest.config.ts`, `package.json` scripts, copy test files.
- [ ] **Step 13: Verify** — `npm test` (unit) passes; `npm run test:integration` passes against the test branch; `npm run test:e2e` passes (requires dev server on 3010); `gh workflow run test.yml` queued on the GitHub repo.
- [ ] **Step 14: Automated checks (the existing ones) still pass.**
- [ ] **Step 15: Commit** — `feat(vitest): expanded testing scaffold (integration via Neon branch, Playwright e2e, GitHub Actions)`.

---

## Task 8: `admin-scaffold` module

**Files (module artifact):** `modules/admin-scaffold/` with README, deps.json (empty), env.example (empty — no new vars), src/{app/(app)/admin/...}. Depends on `role-gates`.

**Patches:**
- Navbar — conditional "Admin" link visible when `effectiveRole === "admin"`.

- [ ] **Step 1: `deps.json`** — empty.
- [ ] **Step 2: `env.example`** — comment-only file noting no new vars.
- [ ] **Step 3: `src/app/(app)/admin/layout.tsx`** — calls `requireRole("admin")`; renders sub-navbar.
- [ ] **Step 4: `src/app/(app)/admin/page.tsx`** — landing.
- [ ] **Step 5: `src/app/(app)/admin/users/page.tsx`** — paginated users list (server component).
- [ ] **Step 6: `src/app/(app)/admin/users/_actions.ts`** — `setUserRole(userId, role)` server action; calls `requireRole("admin")`.
- [ ] **Step 7: `src/app/(app)/admin/users/_components/RoleSelect.tsx`** — client combobox.
- [ ] **Step 8: README — explicitly lists `role-gates` as prerequisite.**
- [ ] **Step 9: Trunk patches** — Navbar conditional "Admin" link.
- [ ] **Step 10: Verify** — as `OWNER_EMAIL`, see "Admin" link; visit `/admin/users`; list shows all signed-up users; change a user's role via dropdown; reload list; new role reflected. Sign out, sign in as a non-admin user — no "Admin" link visible; direct nav to `/admin` redirects to `/dashboard`.
- [ ] **Step 11: Automated checks pass.**
- [ ] **Step 12: Commit** — `feat(admin-scaffold): module artifact + trunk install (users list, role editor; depends on role-gates)`.

---

## Task 9: Cross-module integration check + version bump + tag

**Files:**
- Modify: `package.json` (`"version": "0.2.0"`).
- Modify: `modules/README.md` — update each row's "What it adds" cell to reflect realized scope (replace any forward-looking phrasing with present tense).

- [ ] **Step 1: Full clean rebuild from scratch**

```bash
rm -rf node_modules .next .turbo
npm install
npm run db:migrate   # idempotent
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all pass after clean install. Build output shows `ƒ Proxy (Middleware)` and routes for every new module page (`/billing`, `/chat`, `/admin/*`, etc.).

- [ ] **Step 2: Full live E2E**

Start dev server (`npx next dev -p 3010` + `stripe listen --forward-to localhost:3010/api/stripe/webhook` in parallel).

Run the following end-to-end:
1. Sign up as a fresh non-owner email.
2. Verify email via the link in inbox (email-resend).
3. Land on dashboard. Open notes, create one. Attach a file (blob). Confirm file appears in dreamforge-uploads namespaced under agenticbuilder/<userId>/.
4. Open chat. Send a message. Confirm streaming response. Switch model. Confirm next response uses new model.
5. Open billing. Confirm "Free" plan. Click "Upgrade to Pro". Use test card. Confirm webhook delivery; plan updates to Pro.
6. Open Customer Portal. Cancel subscription. Confirm plan reverts to Free on dashboard refresh.
7. Sign out. Sign in as `OWNER_EMAIL`. Verify "Admin" link in navbar.
8. Visit /admin/users. Confirm both users listed. Change non-owner user's role to admin. Sign out. Sign in as that user. Confirm "Admin" link now visible.
9. Sign out. Direct nav to /notes, /admin, /billing, /chat — all redirect to /login with ?next=... in query.

- [ ] **Step 3: Update `modules/README.md`** — change tone in the "seven modules (planned)" table from forward-looking to present-tense. Rename heading to "The seven modules". Update any "(Plan B)" references.

- [ ] **Step 4: Bump version**

In `package.json`: `"version": "0.2.0"`.

- [ ] **Step 5: Commit version bump**

```bash
git add package.json modules/README.md
git commit -m "chore: bump version to 0.2.0 (modules shipped)"
```

- [ ] **Step 6: Tag v0.2.0 and push**

```bash
git tag -a v0.2.0 -m "AgenticBuilder v0.2 — all 7 modules shipped + installed in canonical repo"
git push origin main
git push origin v0.2.0
```

---

## Acceptance — full plan

- [ ] All 7 modules have `modules/<name>/{README.md, deps.json, env.example, src/, migrations/?}`.
- [ ] Each module's README contains exactly the six H2 sections in the required order.
- [ ] Each module is installed onto the trunk (working main reflects v0.2.0 with everything wired in).
- [ ] `npm install && npm run typecheck && npm run lint && npm test && npm run build` all pass on a fresh clean clone.
- [ ] Live E2E in Task 9 Step 2 passes every numbered step.
- [ ] `OWNER_EMAIL` bypass works against role gates AND plan gates.
- [ ] Files uploaded via blob module live under `dreamforge-uploads` at paths namespaced `agenticbuilder/<userId>/...`.
- [ ] `git tag v0.2.0` lands on the final merge.
- [ ] GitHub Actions test workflow runs successfully on a PR (vitest module).

## Out of scope (deferred)

- The onboarding skill (Plan C).
- Multi-tenancy / orgs.
- Per-seat billing.
- Background jobs / queues.
- Storybook.
- Internationalization.
- A `create-agenticbuilder` npm CLI.
