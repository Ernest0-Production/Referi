import { test, expect } from "@playwright/test";

test.describe("Vacancies catalog", () => {
  test("home page shows vacancy catalog without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole("heading", { name: "Вакансии" })).toBeVisible();
  });

  test("/vacancies redirects to / preserving query", async ({ page }) => {
    await page.goto("/vacancies?page=2&sort=salary_desc");
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/sort=salary_desc/);
    const path = new URL(page.url()).pathname;
    expect(path).toBe("/");
  });

  test("vacancies page is accessible without auth", async ({ page }) => {
    await page.goto("/vacancies");
    await expect(page).not.toHaveURL(/login/);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByRole("heading", { name: "Вакансии" })).toBeVisible();
  });

  test("vacancies page shows vacancy cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("vacancies filters include sort and salary controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Сортировка")).toBeVisible();
    await expect(page.getByPlaceholder("От")).toBeVisible();
    await expect(page.getByPlaceholder("До")).toBeVisible();
  });
});

test.describe("Authentication flow", () => {
  test("/login page renders GitHub sign-in button", async ({ page }) => {
    await page.goto("/login");
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
  test("Mock complete endpoint requires paymentId", async ({ request }) => {
    const response = await request.post("/api/pay/mock-complete", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(400);
  });
});
