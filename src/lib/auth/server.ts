import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    ...(process.env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://localhost:3003",
          "http://localhost:3004",
          "http://localhost:3005",
        ]
      : []),
  ],
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const { passwordResetEmail } = await import("@/lib/email/templates/password-reset");
      const { sendEmail } = await import("@/lib/email/send");
      const { subject, html, text } = passwordResetEmail({ name: user.name, url });
      await sendEmail({ to: user.email, subject, html, text });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { verifyEmail } = await import("@/lib/email/templates/verify");
      const { sendEmail } = await import("@/lib/email/send");
      const { subject, html, text } = verifyEmail({ name: user.name, url });
      await sendEmail({ to: user.email, subject, html, text });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // refresh once per day
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

export type Auth = typeof auth;
