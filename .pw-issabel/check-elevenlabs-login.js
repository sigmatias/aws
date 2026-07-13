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
    await page.goto('https://elevenlabs.io/app/sign-in', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    const bodyBefore = await page.locator('body').innerText();
    if (/captcha|not a robot|verify you are human/i.test(bodyBefore)) {
      console.log('CAPTCHA_PRESENT');
      return;
    }

    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForTimeout(6000);

    console.log(`URL ${page.url()}`);
    console.log(`BODY ${(await page.locator('body').innerText()).slice(0, 3000)}`);
    await page.screenshot({ path: 'elevenlabs-login-result.png', fullPage: true });
    await context.storageState({ path: 'elevenlabs-login-state.json' });
  } finally {
    await browser.close();
  }
})();
