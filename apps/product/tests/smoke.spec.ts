import { test, expect } from "@playwright/test";

test("home page renders the start-session card", async ({ request, page }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Rivals Beta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start session" })).toBeVisible();
});

test("two players can join the same session and see each other", async ({
  browser,
}) => {
  const phoneViewport = { width: 390, height: 844 };

  const contextA = await browser.newContext({ viewport: phoneViewport });
  const contextB = await browser.newContext({ viewport: phoneViewport });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await pageA.goto("/");
    await pageA.getByRole("button", { name: "Start session" }).click();

    const codeLocator = pageA.locator("#code");
    await expect(codeLocator).toHaveText(/^[A-Z2-9]{5}$/, { timeout: 10_000 });
    const code = (await codeLocator.textContent())?.trim() ?? "";
    expect(code).toMatch(/^[A-Z2-9]{5}$/);

    // No horizontal scroll on a phone viewport.
    const scrollWidthA = await pageA.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidthA).toBeLessThanOrEqual(phoneViewport.width);

    // First player should be assigned a role.
    await expect(pageA.locator("#role-a")).toHaveAttribute(
      "data-state",
      "connected",
      { timeout: 10_000 },
    );

    // Second player joins via the shareable link.
    await pageB.goto(`/?s=${code}`);
    await expect(pageB.locator("#code")).toHaveText(code, { timeout: 10_000 });

    // Both pages should now show two connected roles.
    await expect(pageA.locator("#role-a")).toHaveAttribute(
      "data-state",
      "connected",
      { timeout: 10_000 },
    );
    await expect(pageA.locator("#role-b")).toHaveAttribute(
      "data-state",
      "connected",
      { timeout: 10_000 },
    );
    await expect(pageB.locator("#role-a")).toHaveAttribute(
      "data-state",
      "connected",
      { timeout: 10_000 },
    );
    await expect(pageB.locator("#role-b")).toHaveAttribute(
      "data-state",
      "connected",
      { timeout: 10_000 },
    );

    // Distinct roles: exactly one page is "self" on A, the other on B.
    const aSelfOnA = await pageA
      .locator("#role-a")
      .getAttribute("data-self");
    const bSelfOnA = await pageA
      .locator("#role-b")
      .getAttribute("data-self");
    const aSelfOnB = await pageB
      .locator("#role-a")
      .getAttribute("data-self");
    const bSelfOnB = await pageB
      .locator("#role-b")
      .getAttribute("data-self");
    expect(`${aSelfOnA}${bSelfOnA}`).toBe("truefalse");
    expect(`${aSelfOnB}${bSelfOnB}`).toBe("falsetrue");

    // Third device hits the same code: must be rejected with a clear message.
    const contextC = await browser.newContext({ viewport: phoneViewport });
    const pageC = await contextC.newPage();
    try {
      await pageC.goto(`/?s=${code}`);
      await expect(
        pageC.getByRole("heading", { name: "Session is full" }),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await contextC.close();
    }
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
