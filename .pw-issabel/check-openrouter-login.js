const { chromium } = require('playwright');

const EMAIL = process.env.ACCOUNT_EMAIL;
const PASSWORD = process.env.ACCOUNT_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error('ACCOUNT_EMAIL and ACCOUNT_PASSWORD are required');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('https://openrouter.ai/sign-in', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(2500);

    await page.locator('input[name="identifier"]').fill(EMAIL);
    await page.locator('button:visible').filter({ hasText: /continue/i }).first().click();
    await page.locator('input[name="password"]:visible').waitFor({ timeout: 30000 });
    await page.locator('input[name="password"]:visible').fill(PASSWORD);
    await page.locator('button:visible').filter({ hasText: /continue|sign in/i }).first().click();
    await page.waitForTimeout(6000);

    console.log(`URL ${page.url()}`);
    console.log(`BODY ${(await page.locator('body').innerText()).slice(0, 3000)}`);
    await page.screenshot({ path: 'openrouter-login-result.png', fullPage: true });
    await context.storageState({ path: 'openrouter-login-state.json' });
  } finally {
    await browser.close();
  }
})();
