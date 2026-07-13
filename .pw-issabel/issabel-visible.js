const { chromium } = require("playwright");

const IP = process.env.ISSABEL_IP || "44.213.63.39";
const BASE = `https://${IP}:4443`;

async function clickIfPresent(page, selector) {
  const locator = page.locator(selector).first();
  if (await locator.count()) {
    await locator.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

(async () => {
  const port = process.env.CDP_PORT || "9223";
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Security.enable");
  await client.send("Security.setIgnoreCertificateErrors", { ignore: true });

  await page.bringToFront();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1500);

  if (await page.locator('input[name="input_user"]').count()) {
    await page.fill('input[name="input_user"]', "admin");
    await page.fill('input[name="input_pass"]', "issabel-4");
    await Promise.all([
      page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {}),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);
    await page.waitForTimeout(2500);
  }

  await clickIfPresent(page, 'button[aria-label="Close"]');
  await page.goto(`${BASE}/index.php?menu=pbxconfig&display=extensions`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    for (const selector of [
      "#cboxOverlay",
      "#colorbox",
      "#cboxWrapper",
      ".fancybox-overlay",
      ".fancybox-wrap",
      ".modal-backdrop",
      ".modal",
    ]) {
      for (const node of document.querySelectorAll(selector)) {
        node.remove();
      }
    }
    for (const frame of document.querySelectorAll("iframe")) {
      const src = frame.getAttribute("src") || "";
      if (!src || src === "about:blank") frame.remove();
    }
    document.body.classList.remove("modal-open");
    document.body.style.zoom = "0.9";
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.bringToFront();
  console.log(`READY ${page.url()}`);
  process.exit(0);
})();
