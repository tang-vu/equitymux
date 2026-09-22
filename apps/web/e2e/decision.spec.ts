import { expect, test as base } from "@playwright/test";

const test = base.extend<{ browserErrors: void }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use();
      expect(errors, "browser must not silently fail hydration").toEqual([]);
    },
    { auto: true },
  ],
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
  await page.screenshot({
    path: "../../docs/demo/decision-mobile.png",
    fullPage: true,
  });
});
