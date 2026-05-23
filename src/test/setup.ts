import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test", quiet: true });

// @ts-expect-error NODE_ENV is read-only but Vitest sets it
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? "test-secret-32-bytes-ok-for-tests";
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
process.env.OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@example.com";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_test_key_for_tests";
process.env.EMAIL_FROM = process.env.EMAIL_FROM ?? "no-reply@example.com";
