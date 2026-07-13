const { chromium } = require('D:/caches/pw-capture/node_modules/playwright-core');

const EMAIL = process.env.ACCOUNT_EMAIL;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = 'D:/caches/pw-profiles/ep3-slack';

(async () => {
  const context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME,
    headless: false,
    viewport: { width: 1366, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();

  try {
    await page.goto('https://slack.com/get-started#/createnew', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.getByRole('button', { name: /continue|continuar/i }).click();
    await page.waitForTimeout(6000);

    const anchorFrame = page.frames().find(frame => /recaptcha\/api2\/anchor/.test(frame.url()));
    if (anchorFrame) {
      await anchorFrame.locator('#recaptcha-anchor').click();
      await page.waitForTimeout(8000);
    }

    console.log(`URL ${page.url()}`);
    console.log(`BODY ${(await page.locator('body').innerText()).slice(0, 3500)}`);
    console.log(`FRAMES ${JSON.stringify(page.frames().map(frame => frame.url()), null, 2)}`);
    await page.screenshot({ path: '.pw-issabel/local-slack-result.png', fullPage: true });
  } finally {
    await context.close();
  }
})();
