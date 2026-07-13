const { chromium } = require('D:/caches/pw-capture/node_modules/playwright-core');

const EMAIL = process.env.ACCOUNT_EMAIL;
const PASSWORD = process.env.ACCOUNT_PASSWORD;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = 'D:/caches/pw-profiles/ep3-openrouter';

(async () => {
  const context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME,
    headless: false,
    viewport: { width: 1366, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();

  page.on('response', async response => {
    if (response.status() >= 400) {
      console.log(`HTTP_ERROR ${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.goto('https://openrouter.ai/sign-up', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    await page.locator('input[name="firstName"]').fill('Matias');
    await page.locator('input[name="lastName"]').fill('Oyanedel');
    await page.locator('input[name="emailAddress"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="legalAccepted"]').check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForTimeout(12000);

    console.log(`URL ${page.url()}`);
    console.log(`BODY ${(await page.locator('body').innerText()).slice(0, 3500)}`);
    await page.screenshot({ path: '.pw-issabel/local-openrouter-result.png', fullPage: true });
  } finally {
    await context.close();
  }
})();
