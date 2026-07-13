const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  const page =
    context.pages().find((p) => p.url().includes("3.219.120.166")) ||
    context.pages()[0];
  await page.bringToFront();
  await page.keyboard.press("Escape").catch(() => {});
  for (const selector of [
    'button[aria-label="Close"]',
    'button[aria-label="Cerrar"]',
    'button:has-text("No")',
    'button:has-text("Ahora no")',
  ]) {
    const loc = page.locator(selector);
    const count = await loc.count().catch(() => 0);
    for (let i = count - 1; i >= 0; i -= 1) {
      await loc.nth(i).click({ timeout: 500 }).catch(() => {});
    }
  }
  await page.waitForTimeout(800);
  process.exit(0);
})();
