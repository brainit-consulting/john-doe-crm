import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "user" },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
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
          return { data };
        },
      },
    },
  },
});

export type Auth = typeof auth;
