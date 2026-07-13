const { chromium } = require("playwright");

const BASE = process.env.N8N_URL || "https://3.219.120.166.nip.io";
const EMAIL = process.env.N8N_EMAIL;
const PASSWORD = process.env.N8N_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error("Missing N8N_EMAIL or N8N_PASSWORD");
}

async function fillFirst(page, selectors, value) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if (await loc.count()) {
      await loc.fill(value);
      return true;
    }
  }
  return false;
}

async function clickButton(page, regex) {
  const btn = page.getByRole("button", { name: regex }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
}

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || (await context.newPage());

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const body = await page.locator("body").innerText().catch(() => "");
  if (/sign in|log in|password|email/i.test(body)) {
    await fillFirst(
      page,
      [
        'input[name="emailOrLdapLoginId"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[placeholder*="email" i]',
      ],
      EMAIL
    );
    await fillFirst(page, ['input[type="password"]'], PASSWORD);
    await clickButton(page, /sign in|log in|login|iniciar/i);
  }

  await page.goto(`${BASE}/home/workflows`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.bringToFront();
  console.log(`READY ${page.url()}`);
  process.exit(0);
})();
