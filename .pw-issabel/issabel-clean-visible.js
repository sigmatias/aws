const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  const page =
    context.pages().find((p) => p.url().includes("44.213.63.39")) ||
    context.pages()[0];

  await page.bringToFront();
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);

  const selectors = [
    ".modal-header button.close",
    ".modal button.close",
    "button.close",
    '[data-dismiss="modal"]',
    ".ui-dialog-titlebar-close",
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      await locator.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(700);
    }
  }

  await page.evaluate(() => {
    for (const node of document.querySelectorAll(".modal-backdrop, .modal")) {
      node.remove();
    }
    document.body.classList.remove("modal-open");
    document.body.style.zoom = "0.9";
    window.scrollTo(0, 0);
  }).catch(() => {});

  await page.bringToFront();
  await page.waitForTimeout(1000);
  console.log(`READY ${page.url()}`);
  process.exit(0);
})();
