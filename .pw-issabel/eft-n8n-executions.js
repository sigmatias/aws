const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: false, viewport: null,
      args: ['--window-position=-1366,336', '--window-size=1366,768', '--ignore-certificate-errors'] },
  );
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://3.219.120.166.nip.io/workflow/eft-citas-cuy5132-001/executions', {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await page.waitForTimeout(4000);
  console.log('URL', page.url());
})();
