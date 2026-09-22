import { expect, test as base } from "@playwright/test";

const test = base.extend<{ browserErrors: void }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await use();
      expect(errors, "browser must not silently fail hydration").toEqual([]);
    },
    { auto: true },
  ],
});

test("desk loads immediately and evidence is keyboard accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to workspace" }),
  ).toBeFocused();
  await expect(page.locator(".route-evidence")).toHaveCount(3);
  const inspect = page.getByRole("button", { name: "Inspect NVDAon evidence" });
  await inspect.focus();
  await page.keyboard.press("Enter");
  await expect(inspect).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Enter");
  await expect(inspect).toHaveAttribute("aria-expanded", "false");
  await page.getByText("Workspace", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Receipt archive" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".workspace-menu")).not.toHaveAttribute("open");
  await page.getByRole("button", { name: "Explore Apple" }).click();
  await expect(page.locator(".asset-heading")).toContainText("AAPL");
});

test("workspace tools remain reachable under the shared theme", async ({
  page,
}) => {
  for (const route of [
    "/explorer",
    "/agent",
    "/constitution",
    "/terminal",
    "/routes",
    "/receipts",
    "/dev",
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("policy challenge restores the user's actual baseline", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".route-evidence")).toHaveCount(3);
  await page.locator("#risk-policy summary").click();
  await page.getByLabel("Maximum premium (bps)", { exact: true }).fill("75");
  await page.getByRole("button", { name: "Compare exposure" }).click();
  await expect(page.locator("#risk-policy summary")).toContainText("75 bps");
  await page
    .getByRole("button", { name: "Require liquidity evidence" })
    .click();
  await expect(page.getByText("The right decision is to stop.")).toBeVisible();
  await page.getByRole("button", { name: "Restore baseline policy" }).click();
  await expect(
    page.getByLabel("Maximum premium (bps)", { exact: true }),
  ).toHaveValue("75");
  await expect(
    page.getByLabel("Minimum executable liquidity ($)", { exact: true }),
  ).toHaveValue("0");
});

test("judge can compare, challenge, restore and independently verify", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Compare exposure" }).click();
  await expect(
    page.getByText("RECORDED · ANALYSIS ONLY", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".route-evidence")).toHaveCount(3);
  await expect(page.getByText("leads the research shortlist")).toBeVisible();
  await page
    .getByRole("button", { name: "Require liquidity evidence" })
    .click();
  await expect(page.getByText("The right decision is to stop.")).toBeVisible();
  await expect(
    page.getByText("Same snapshot. Only the policy changed."),
  ).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: "../../docs/demo/decision-policy-stop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Restore baseline policy" }).click();
  await expect(page.getByText("leads the research shortlist")).toBeVisible();
  await page.getByRole("button", { name: "Verify & replay" }).click();
  await expect(page.getByRole("status")).toContainText(
    "MATCH · Browser SHA-256",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt" }).click();
  expect((await download).suggestedFilename()).toBe(
    "equitymux-NVDA-decision.json",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "../../docs/demo/decision-desk.png",
    fullPage: true,
  });
});

test("small screen keeps the decision readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Compare exposure" }).click();
  await expect(page.locator(".route-evidence")).toHaveCount(3);
  const verdict = await page.locator(".decision-verdict").boundingBox();
  const policy = await page.locator("#risk-policy").boundingBox();
  expect(verdict!.y).toBeLessThan(policy!.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: "../../docs/demo/decision-mobile.png",
    fullPage: true,
  });
});
