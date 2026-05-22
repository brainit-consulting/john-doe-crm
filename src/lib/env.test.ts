import { describe, it, expect } from "vitest";

describe("env schema", () => {
  it("parses a valid env object", async () => {
    const { parseEnv } = await import("./env");
    const result = parseEnv({
      DATABASE_URL: "postgres://u:p@h/d",
      BETTER_AUTH_SECRET: "x".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3000",
      OWNER_EMAIL: "owner@example.com",
    });
    expect(result.DATABASE_URL).toBe("postgres://u:p@h/d");
    expect(result.OWNER_EMAIL).toBe("owner@example.com");
  });

  it("throws when DATABASE_URL is missing", async () => {
    const { parseEnv } = await import("./env");
    expect(() =>
      parseEnv({
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://localhost:3000",
        OWNER_EMAIL: "owner@example.com",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("throws when BETTER_AUTH_SECRET is too short", async () => {
    const { parseEnv } = await import("./env");
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://u:p@h/d",
        BETTER_AUTH_SECRET: "tooshort",
        BETTER_AUTH_URL: "http://localhost:3000",
        OWNER_EMAIL: "owner@example.com",
      }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("rejects an invalid OWNER_EMAIL", async () => {
    const { parseEnv } = await import("./env");
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://u:p@h/d",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://localhost:3000",
        OWNER_EMAIL: "not-an-email",
      }),
    ).toThrow(/OWNER_EMAIL/);
  });
});
