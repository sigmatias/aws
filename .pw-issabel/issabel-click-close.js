const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  const page = context.pages().find((p) => p.url().includes("44.213.63.39"));
  await page.bringToFront();
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
  await page.mouse.click(672, 102).catch(() => {});
  await page.waitForTimeout(900);
  await page.mouse.click(836, 170).catch(() => {});
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    document.body.style.zoom = "0.9";
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.bringToFront();
  await page.waitForTimeout(1000);
  console.log(`READY ${page.url()}`);
  process.exit(0);
})();
