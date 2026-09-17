// Capture demo screenshots of the running app.
//   npm i -D puppeteer-core   (in a scratch dir — not a repo dep)
//   CHROME=/path/to/chrome BASE=http://localhost:3000 OUT=docs/demo node scripts/screenshots.mjs
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = process.env.CHROME ?? "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const OUT = process.env.OUT ?? "docs/demo";
const BASE = process.env.BASE ?? "http://localhost:3000";
mkdirSync(OUT, { recursive: true });

const pages = ["", "constitution", "explorer", "routes", "receipts", "agent", "dev"];
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
for (const p of pages) {
  const name = p || "home";
  try {
    await page.goto(`${BASE}/${p}`, { waitUntil: "networkidle0", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 4000)); // let react-query settle
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(name, "ok");
  } catch (e) {
    console.log(name, "FAIL", e.message);
  }
}
await browser.close();
