import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.argv[2] || "https://equitymux.tangvu.dev");
  await page.locator(".route-evidence").first().waitFor();
  assert.equal(await page.locator(".route-evidence").count(), 3);
  await page
    .getByRole("button", { name: "Require liquidity evidence" })
    .click();
  await page.getByText("The right decision is to stop.").waitFor();
  await page.getByRole("button", { name: "Restore baseline policy" }).click();
  await page.getByText("leads the research shortlist").waitFor();
  await page.getByRole("button", { name: "Verify & replay" }).click();
  await page.getByText("MATCH · Browser SHA-256", { exact: false }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Public browser: compare / policy challenge / restore / replay PASS",
  );
} finally {
  await browser.close();
}
