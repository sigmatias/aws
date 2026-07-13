const { chromium } = require("playwright");

const BASE = process.env.N8N_URL || "https://3.219.120.166.nip.io";

async function clickIfVisible(page, locator) {
  if (await locator.count()) {
    try {
      await locator.first().click({ timeout: 1500 });
      await page.waitForTimeout(800);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  const page =
    context.pages().find((p) => p.url().includes("3.219.120.166")) ||
    context.pages()[0] ||
    (await context.newPage());

  await page.bringToFront();
  await page.waitForTimeout(1000);

  await clickIfVisible(page, page.locator('button[aria-label="Close"]'));
  await clickIfVisible(page, page.getByRole("button", { name: /skip/i }));

  const selects = page.locator(
    '[role="combobox"], input[placeholder*="Select"], .el-select'
  );
  const count = await selects.count().catch(() => 0);
  for (let i = 0; i < Math.min(count, 8); i += 1) {
    const select = selects.nth(i);
    try {
      await select.click({ timeout: 1000 });
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
    } catch {
      // Some selects are decorative wrappers; ignore.
    }
  }

  for (const label of [/get started/i, /continue/i, /finish/i, /save/i]) {
    await clickIfVisible(page, page.getByRole("button", { name: label }));
  }

  await page.goto(`${BASE}/home/workflows`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.bringToFront();
  console.log(`READY ${page.url()}`);
  process.exit(0);
})();
