import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("missing observations are readable and never plotted", async ({
  page,
}) => {
  await page.route("**/api/decisions", async (route) => {
    const response = await route.fetch();
    const receipt = await response.json();
    // Deliberately incomplete API response for presentation testing only.
    receipt.decision.routes[0].sharePriceUsd = null;
    receipt.decision.routes[0].tokenPriceUsd = null;
    receipt.decision.routes[0].premiumBps = null;
    await route.fulfill({ json: receipt });
  });
  await page.goto("/");
  await expect(page.locator(".issuer-sleeve")).toHaveCount(3);
  await expect(page.locator(".issuer-sleeve").first()).toContainText("Unknown");
  await expect(
    page.locator(".ruler-track").first().locator("span"),
  ).toHaveCount(0);
  await expect(
    page.locator(".parity-track").first().locator(".parity-dot"),
  ).toHaveCount(0);
});

test("supporting journeys retain compilation, tasks and legacy failure behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/constitution");
  await page
    .getByRole("button", { name: "Compile policy", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve & activate", exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Constitution instructions")
    .fill("Never spend my last $50 USDC. Unsupported moon instruction.");
  await expect(
    page.getByRole("button", { name: "Approve & activate", exact: false }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Compile policy", exact: true })
    .click();
  await expect(page.getByText("not compiled", { exact: true })).toBeVisible();
  // Activation is explicit in the isolated test API, with execution disabled.
  await page
    .getByLabel("Constitution instructions")
    .fill("Never spend my last $50 USDC.");
  await page
    .getByRole("button", { name: "Compile policy", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve & activate", exact: false })
    .click();
  await expect(page.locator("main")).toContainText("active · rev");
  await page.screenshot({
    path: "../../docs/demo/instrument-constitution-active.png",
    fullPage: true,
  });
  await page.goto("/agent");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.locator("main pre")).toContainText("NOT_EXECUTED");
  await expect(page.locator("main")).toContainText("SUCCEEDED");
  await page.screenshot({
    path: "../../docs/demo/instrument-agent-result.png",
    fullPage: true,
  });
  for (const route of ["/terminal", "/routes"]) {
    await page.goto(route);
    const input = page.getByRole("textbox");
    await input.fill("Buy $10 of NVDA");
    await page
      .getByRole("button", {
        name: route === "/terminal" ? "Route intent" : "Run tournament",
      })
      .click();
    await expect(
      page.getByText("final state:", { exact: false }),
    ).toBeVisible();
    await expect(page.locator("main")).toContainText(
      /NO_VALID_ROUTE|POLICY_REJECTED|SIMULATION_FAILED/,
    );
    await page.screenshot({
      path: `../../docs/demo/instrument-${route.slice(1)}-result.png`,
      fullPage: true,
    });
  }
  await page.goto("/receipts");
  await page.locator("main button").first().click();
  await expect(
    page.getByRole("heading", { name: "Execution Receipt" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../../docs/demo/instrument-receipt-detail-390.png",
    fullPage: true,
  });
});

test("every workspace keeps a usable failure surface", async ({ page }) => {
  test.setTimeout(90_000);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 503, json: { detail: "Test API unavailable" } }),
  );
  for (const route of [
    "/",
    "/explorer",
    "/constitution",
    "/agent",
    "/dev",
    "/receipts",
    "/terminal",
    "/routes",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    if (route === "/terminal" || route === "/routes") {
      await page.getByRole("textbox").fill("Buy $10 of NVDA");
      await page
        .getByRole("button", {
          name: route === "/terminal" ? "Route intent" : "Run tournament",
        })
        .click();
    }
    await expect(page.locator("main")).toContainText("Test API unavailable", {
      timeout: 15000,
    });
  }
});

test("sleeves, parity and inspector remain synchronized across tickers", async ({
  page,
}) => {
  await page.goto("/");
  const sleeve = page.getByRole("button", {
    name: "Select NVDAx normalization",
  });
  await sleeve.click();
  await expect(page.locator(".parity-axis span").first()).toHaveText(
    /^-\d.* bps$/,
  );
  await expect(page.locator(".parity-row-value small").first()).toContainText(
    " at $",
  );
  await expect(sleeve).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Inspect NVDAx evidence" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".evidence-detail")).toContainText("SOURCE NOTES");
  await page.getByText("Explain normalization", { exact: false }).click();
  await page.getByRole("button", { name: "03 / Apply policy" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".chapter-copy")).toContainText(
    "Evidence passes through your policy",
  );
  await page.getByRole("button", { name: "Explore Tesla" }).click();
  await expect(page.locator(".instrument-asset")).toContainText("TSLA");
  await expect(page.locator(".evidence-detail")).toHaveCount(0);
});

test("challenge uses applied policy and restores a custom same-snapshot baseline", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".route-evidence")).toHaveCount(3);
  await page.locator("#risk-policy summary").click();
  await page.getByLabel("Maximum premium (bps)", { exact: true }).fill("73");
  await page.getByRole("button", { name: "Apply to same snapshot" }).click();
  await expect(page.locator("#risk-policy summary")).toContainText("73 bps");
  await page.getByLabel("Maximum premium (bps)", { exact: true }).fill("12");
  await expect(page.locator(".pending-policy")).toBeVisible();
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/decisions/compare"),
  );
  await page
    .getByRole("button", { name: "Require liquidity evidence" })
    .click();
  const body = (await request).postDataJSON();
  expect(body.policy.max_premium_bps).toBe("73");
  await expect(page.locator(".memo-state")).toHaveText("NO_VALID_ROUTE");
  await expect(page.locator(".decisive-reason")).toContainText(
    "Executable depth unavailable",
  );
  const restore = page.waitForResponse((r) =>
    r.url().endsWith("/decisions/compare"),
  );
  await page.getByRole("button", { name: "Restore baseline policy" }).click();
  const restored = await (await restore).json();
  expect(restored.receipt.snapshot).toEqual(body.receipt.snapshot);
  expect(restored.receipt.policy.max_premium_bps).toBe("73");
});

test("failed live request preserves recorded evidence and inspection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Select NVDAon normalization" })
    .click();
  const before = await page.locator(".receipt-hash code").textContent();
  await page.route("**/api/decisions", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      status: 503,
      json: { detail: "Live feed unavailable" },
    });
  });
  await page.getByLabel("Data source").selectOption("live");
  await page.getByRole("button", { name: "Compare exposure" }).click();
  await expect(
    page.getByText("Request pending · previous evidence shown"),
  ).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Live feed unavailable",
  );
  await expect(page.locator(".receipt-hash code")).toHaveText(before!);
  await expect(page.locator(".source-stamp")).toContainText("RECORDED");
  await expect(
    page.getByRole("button", { name: "Inspect NVDAon evidence" }),
  ).toHaveAttribute("aria-expanded", "true");
});

test("partial verification cannot retain an earlier success", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Verify & replay" }).click();
  await expect(page.locator(".verification-result")).toContainText(
    "MATCH · Browser",
  );
  await page.route("**/api/decisions/replay", (route) =>
    route.fulfill({ status: 503, json: { detail: "Replay unavailable" } }),
  );
  await page.getByRole("button", { name: "Verify & replay" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Replay unavailable",
  );
  await expect(page.locator(".verification-result")).toContainText(
    "Decision replay pending",
  );
  await expect(page.locator(".verification-pass")).toHaveCount(0);
});

test("unknown venue does not become open or fresh", async ({ page }) => {
  await page.route("**/api/explore/NVDA", (route) =>
    route.fulfill({
      json: { ticker: "NVDA", market: {}, representations: [] },
    }),
  );
  await page.goto("/explorer");
  await expect(
    page.getByText(
      "Venue open status: Unknown. Reference freshness is unverified.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("No representations returned", { exact: false }),
  ).toBeVisible();
});

test("all workspaces fit mobile and desktop, with captures and runtime measurements", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    (window as unknown as { shifts: number[] }).shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!e.hadRecentInput)
          (window as unknown as { shifts: number[] }).shifts.push(e.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const measurements: unknown[] = [];
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of width === 390 || width === 1440
      ? [
          "/",
          "/explorer",
          "/constitution",
          "/terminal",
          "/routes",
          "/receipts",
          "/agent",
          "/dev",
        ]
      : ["/"]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await page.waitForLoadState("networkidle");
      if (route === "/")
        await expect(page.locator(".issuer-sleeve")).toHaveCount(3);
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `../../docs/demo/instrument-${route === "/" ? "home" : route.slice(1)}-${width}.png`,
        fullPage: true,
      });
      let inspectionRoundtripMs: number | null = null;
      if (route === "/") {
        const start = await page.evaluate(() => performance.now());
        const inspect = page.getByRole("button", {
          name: "Inspect NVDAon evidence",
        });
        await inspect.click();
        await expect(inspect).toHaveAttribute("aria-expanded", "true");
        inspectionRoundtripMs = await page.evaluate(
          (start) => performance.now() - start,
          start,
        );
      }
      measurements.push(
        await page.evaluate(
          ({ width, route, inspectionRoundtripMs }) => ({
            width,
            route,
            inspectionRoundtripMs,
            layoutShift: (
              window as unknown as { shifts: number[] }
            ).shifts.reduce((a, b) => a + b, 0),
            resources: performance
              .getEntriesByType("resource")
              .reduce(
                (n, e) => n + (e as PerformanceResourceTiming).transferSize,
                0,
              ),
            domNodes: document.querySelectorAll("*").length,
          }),
          { width, route, inspectionRoundtripMs },
        ),
      );
    }
  }
  await writeFile(
    "../../docs/demo/browser-measurements.json",
    JSON.stringify(measurements, null, 2),
  );
  expect(errors).toEqual([]);
});
