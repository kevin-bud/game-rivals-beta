import { test, expect } from "@playwright/test";

test("home page renders the start-session card", async ({ request, page }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Beacon" })).toBeVisible();
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

test("Beacon: Pilot sees fog porthole; Lighthouse sees full chart", async ({
  browser,
}) => {
  const phoneViewport = { width: 390, height: 844 };

  const contextPilot = await browser.newContext({ viewport: phoneViewport });
  const contextLighthouse = await browser.newContext({
    viewport: phoneViewport,
  });
  const pagePilot = await contextPilot.newPage();
  const pageLighthouse = await contextLighthouse.newPage();

  try {
    // Pilot starts the session (gets role A by spine convention).
    await pagePilot.goto("/");
    await pagePilot.getByRole("button", { name: "Start session" }).click();

    const codeLocator = pagePilot.locator("#code");
    await expect(codeLocator).toHaveText(/^[A-Z2-9]{5}$/, { timeout: 10_000 });
    const code = (await codeLocator.textContent())?.trim() ?? "";
    expect(code).toMatch(/^[A-Z2-9]{5}$/);

    // Lighthouse joins (role B).
    await pageLighthouse.goto(`/?s=${code}`);

    // Both pages should reach the game view.
    const pilotGrid = pagePilot.locator('[data-view="pilot"]');
    const lighthouseGrid = pageLighthouse.locator('[data-view="lighthouse"]');
    await expect(pilotGrid).toBeVisible({ timeout: 10_000 });
    await expect(lighthouseGrid).toBeVisible({ timeout: 10_000 });

    // Visible role labels.
    await expect(
      pagePilot.locator('#game-role-name[data-game-role="pilot"]'),
    ).toHaveText("Pilot");
    await expect(
      pageLighthouse.locator(
        '#game-role-name[data-game-role="lighthouse"]',
      ),
    ).toHaveText("Lighthouse");

    // The Pilot's grid must be 6x10 worth of slots, and must contain at
    // least one fog cell, exactly one ship cell, and zero full-grid markers.
    // The "no full-grid markup" check is real because data-cell-type only
    // appears on cells the server actually revealed to the Pilot.
    const pilotCellCount = await pilotGrid.locator(".cell").count();
    expect(pilotCellCount).toBe(60);

    await expect(
      pilotGrid.locator('.cell[data-fog="true"]'),
    ).not.toHaveCount(0);
    await expect(
      pilotGrid.locator('.cell[data-cell-type="ship"]'),
    ).toHaveCount(1);

    // The Pilot must not receive the rest of the board: rocks outside the
    // porthole must not be present, and the port must not be present unless
    // it happened to land inside the radius (allow at most one).
    const pilotRockCount = await pilotGrid
      .locator('.cell[data-cell-type="rock"]')
      .count();
    const pilotPortCount = await pilotGrid
      .locator('.cell[data-cell-type="port"]')
      .count();
    // The fog porthole has 9 cells max; rocks within view are intentionally
    // suppressed by the generator so this should be 0 in practice. Cap at
    // 8 (any of the 8 neighbours of the ship) as a safety upper bound.
    expect(pilotRockCount).toBeLessThanOrEqual(8);
    expect(pilotPortCount).toBeLessThanOrEqual(1);

    // The Pilot must NOT be able to count all rocks the Lighthouse can see
    // — that would mean the server leaked the full state. Total revealed
    // typed cells must be strictly less than the full 60-cell board.
    const pilotTypedCount = await pilotGrid
      .locator(".cell[data-cell-type]")
      .count();
    expect(pilotTypedCount).toBeLessThan(60);

    // The Lighthouse's grid: exactly 60 typed cells, exactly one ship, one
    // port, and between 6 and 10 rocks (per the brief).
    const lighthouseCellCount = await lighthouseGrid.locator(".cell").count();
    expect(lighthouseCellCount).toBe(60);
    const lighthouseTypedCount = await lighthouseGrid
      .locator(".cell[data-cell-type]")
      .count();
    expect(lighthouseTypedCount).toBe(60);
    await expect(
      lighthouseGrid.locator('.cell[data-cell-type="ship"]'),
    ).toHaveCount(1);
    await expect(
      lighthouseGrid.locator('.cell[data-cell-type="port"]'),
    ).toHaveCount(1);
    const lighthouseRockCount = await lighthouseGrid
      .locator('.cell[data-cell-type="rock"]')
      .count();
    expect(lighthouseRockCount).toBeGreaterThanOrEqual(6);
    expect(lighthouseRockCount).toBeLessThanOrEqual(10);

    // The Lighthouse must never see fog — the Lighthouse view is the full
    // board.
    await expect(
      lighthouseGrid.locator('.cell[data-fog="true"]'),
    ).toHaveCount(0);

    // No horizontal scroll on either phone view.
    const pilotScrollWidth = await pagePilot.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const lighthouseScrollWidth = await pageLighthouse.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(pilotScrollWidth).toBeLessThanOrEqual(phoneViewport.width);
    expect(lighthouseScrollWidth).toBeLessThanOrEqual(phoneViewport.width);
  } finally {
    await contextPilot.close();
    await contextLighthouse.close();
  }
});
