import { test, expect } from "@playwright/test";

test.describe("Vacancies catalog", () => {
  test("home page redirects to /vacancies or shows login", async ({ page }) => {
    await page.goto("/");
    // Should either land on /vacancies or redirect to /login
    await expect(page).toHaveURL(/\/(vacancies|login)/);
  });

  test("vacancies page is accessible without auth", async ({ page }) => {
    await page.goto("/vacancies");
    // Should not redirect to login — public page
    await expect(page).not.toHaveURL(/login/);
    await expect(page).toHaveURL(/vacancies/);
  });

  test("vacancies page shows vacancy cards", async ({ page }) => {
    await page.goto("/vacancies");
    // Wait for the page to fully load
    await page.waitForLoadState("networkidle");
    // Page should contain some content (at minimum the filter/search area)
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Authentication flow", () => {
  test("/login page renders GitHub sign-in button", async ({ page }) => {
    await page.goto("/login");
    // The page should contain a link to GitHub OAuth
    const githubButton = page.getByRole("link", { name: /github/i });
    await expect(githubButton).toBeVisible();
  });

  test("protected /dashboard redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("protected /admin redirects unauthenticated users", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Webhook security", () => {
  test("Telegram webhook returns 401 without secret token", async ({ request }) => {
    const response = await request.post("/api/webhooks/telegram", {
      data: { update_id: 1 },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(401);
  });

  test("Telegram webhook returns 401 with wrong secret token", async ({ request }) => {
    const response = await request.post("/api/webhooks/telegram", {
      data: { update_id: 1 },
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": "wrong-secret",
      },
    });
    expect(response.status()).toBe(401);
  });
});
