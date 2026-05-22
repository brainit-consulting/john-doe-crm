import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test", quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? "test-secret-32-bytes-ok-for-tests";
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
process.env.OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@example.com";
