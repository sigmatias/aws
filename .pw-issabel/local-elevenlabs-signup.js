const { chromium } = require('D:/caches/pw-capture/node_modules/playwright-core');

const EMAIL = process.env.ACCOUNT_EMAIL;
const PASSWORD = process.env.ACCOUNT_PASSWORD;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = 'D:/caches/pw-profiles/ep3-elevenlabs';

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
    await page.goto('https://elevenlabs.io/app/sign-up', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign up', exact: true }).click();
    await page.waitForTimeout(20000);

    console.log(`URL ${page.url()}`);
    console.log(`BODY ${(await page.locator('body').innerText()).slice(0, 3500)}`);
    await page.screenshot({ path: '.pw-issabel/local-elevenlabs-result.png', fullPage: true });
  } finally {
    await context.close();
  }
})();
