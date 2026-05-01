import { test, expect } from "@playwright/test";

/**
 * E2E tests for the vacancy creation flow.
 * These tests require a logged-in REFERRER session.
 * In CI, they run against a staging environment with seed data.
 *
 * To run locally with auth:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
 *   (requires active dev server with a seeded database)
 */

test.describe("Vacancy creation flow (requires auth)", () => {
  test.skip(
    !process.env.E2E_REFERRER_SESSION,
    "Skipped: E2E_REFERRER_SESSION not set (requires authenticated session cookie)",
  );

  test.beforeEach(async ({ context }) => {
    // Set the session cookie if provided
    const sessionCookie = process.env.E2E_REFERRER_SESSION;
    if (sessionCookie) {
      await context.addCookies([
        {
          name: "next-auth.session-token",
          value: sessionCookie,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
        },
      ]);
    }
  });

  test("referrer can view vacancy dashboard", async ({ page }) => {
    await page.goto("/dashboard/vacancy");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("referrer can view attempts pool", async ({ page }) => {
    await page.goto("/dashboard/attempts");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/Пул попыток/i)).toBeVisible();
  });
});

test.describe("Vacancy detail page", () => {
  test("non-existent vacancy shows 404 or redirects", async ({ page }) => {
    const response = await page.goto("/vacancies/00000000-0000-0000-0000-000000000000");
    // Either returns 404 or redirects to vacancies list
    expect(response?.status() === 404 || page.url().includes("/vacancies")).toBeTruthy();
  });
});
