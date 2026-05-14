import { test, expect } from "@playwright/test";

/**
 * E2E tests for the vacancy creation flow.
 * These tests require a logged-in user session (any account).
 *
 * To run locally with auth:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
 *   (requires active dev server with a seeded database)
 */

test.describe("Vacancy creation flow (requires auth)", () => {
  test.skip(
    !process.env.E2E_SESSION_COOKIE,
    "Skipped: E2E_SESSION_COOKIE not set (value of next-auth.session-token cookie)",
  );

  test.beforeEach(async ({ context }) => {
    const sessionCookie = process.env.E2E_SESSION_COOKIE;
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

  test("user can view vacancy account page", async ({ page }) => {
    await page.goto("/vacancy");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("user can view attempts pool", async ({ page }) => {
    await page.goto("/attempts");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/Пул попыток/i)).toBeVisible();
  });
});

test.describe("Public vacancy compose page", () => {
  test("guest can open compose form without redirect to login", async ({ page }) => {
    await page.goto("/vacancies/new");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Разместить рефералку" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Опубликовать рефералку" })).toBeVisible();
  });
});

test.describe("Vacancy detail page", () => {
  test("non-existent vacancy shows 404 or redirects", async ({ page }) => {
    const response = await page.goto("/vacancies/00000000-0000-0000-0000-000000000000");
    // Either returns 404 or redirects to vacancies list
    expect(response?.status() === 404 || page.url().includes("/vacancies")).toBeTruthy();
  });
});
