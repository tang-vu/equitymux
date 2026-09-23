import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test.use({
  video: "on",
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
});

test("record the aperture, policy shutters and evidence press", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await mkdir("../../docs/demo/motion", { recursive: true });
  await page.goto("/");
  await expect(page.locator(".aperture-object")).toHaveCount(3);
  const measurements = await page.evaluate(async () => {
    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const frames: number[] = [];
    let last = 0;
    await new Promise<void>((resolve) => {
      function tick(now: number) {
        if (last) frames.push(now - last);
        last = now;
        if (frames.length < 120) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    frames.sort((a, b) => a - b);
    return {
      navigationLoadMs: nav.loadEventEnd,
      transferBytes: performance
        .getEntriesByType("resource")
        .reduce(
          (total, entry) =>
            total + (entry as PerformanceResourceTiming).transferSize,
          0,
        ),
      frameMedianMs: frames[Math.floor(frames.length / 2)],
      frameP95Ms: frames[Math.floor(frames.length * 0.95)],
      framesOver50Ms: frames.filter((value) => value > 50).length,
      sampleFrames: frames.length,
    };
  });
  await writeFile(
    "../../docs/demo/motion/measurements.json",
    JSON.stringify(measurements, null, 2),
  );
  await page.locator(".aperture-stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "../../docs/demo/motion/01-observe.png" });
  await page.getByRole("button", { name: "02 / Normalize" }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "../../docs/demo/motion/02-normalize.png" });
  await page.getByRole("button", { name: "03 / Apply policy" }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "../../docs/demo/motion/03-policy.png" });
  await page.getByRole("button", { name: "04 / Keep evidence" }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "../../docs/demo/motion/04-evidence.png" });
  await page.getByRole("button", { name: "01 / Observe" }).click();
  await page.waitForTimeout(1000);
  await page
    .getByRole("button", { name: "Require liquidity evidence" })
    .click();
  await expect(page.locator(".comparison-result")).toContainText(
    "Same snapshot",
  );
  await page.locator(".policy-experiment").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await page.screenshot({
    path: "../../docs/demo/motion/05-no-valid-route.png",
  });
  await page.getByRole("button", { name: "Restore baseline policy" }).click();
  await expect(page.locator(".comparison-result")).toContainText(
    "Same snapshot",
  );
  await page.locator(".decision-record").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Verify & replay" }).click();
  await expect(
    page.locator(".verification-lanes [data-status='pass']"),
  ).toHaveCount(3);
  await page.waitForTimeout(1800);
  await page.screenshot({
    path: "../../docs/demo/motion/06-verified-record.png",
  });
  await page.waitForTimeout(9000);
  const video = page.video();
  await page.close();
  await video?.saveAs("../../docs/demo/motion/equitymux-motion.webm");
});
