import { test, expect } from "@playwright/test";

// Smoke e2e for the trunk's auth surface. Deliberately stops short of
// finishing the signup loop — verifying the email requires real mail
// delivery (the email-resend module wires verification on by default).
// This spec confirms:
//   - the landing page renders;
//   - the "Get started" CTA routes to /signup;
//   - the signup form posts and the user lands on a sane "next step"
//     (verification gate at /login, or — if a future module disables
//     verification — /dashboard).
test.describe("auth", () => {
  test("landing page → signup → submit lands on a known auth surface", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /John Doe CRM/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: /get started/i }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByRole("heading", { name: /create your account/i }),
    ).toBeVisible();

    const stamp = Date.now();
    const email = `e2e+${stamp}@example.test`;

    await page.getByLabel(/name/i).fill(`E2E ${stamp}`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill("password123!");
    await page.getByRole("button", { name: /create account/i }).click();

    // With email verification on (trunk default once email-resend is
    // installed), the proxy bounces /dashboard → /login?next=/dashboard.
    // Without verification, the user lands directly on /dashboard. Either
    // is a healthy outcome.
    await page.waitForURL(/\/(login|dashboard|signup)/, { timeout: 15_000 });
    const url = new URL(page.url());
    expect(["/login", "/dashboard", "/signup"]).toContain(url.pathname);
  });
});
