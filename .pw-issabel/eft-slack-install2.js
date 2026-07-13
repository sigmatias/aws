// eft-slack-install2.js - Maneja el caso en que "Install to Duocuc" abre un
// popup/nueva pestana para el consentimiento OAuth.
const path = require('path');
const { chromium } = require('playwright');

const APP_ID = 'A0BH2SK9J9J';

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: true },
  );
  const page = await context.newPage();
  try {
    await page.goto(`https://api.slack.com/apps/${APP_ID}/install-on-team`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(2000);

    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
      page.getByRole('button', { name: 'Install to Duocuc', exact: true }).click(),
    ]);

    const target = popup || page;
    await target.waitForTimeout(2500);
    console.log('TARGET_URL_AFTER_CLICK', target.url());
    await target.screenshot({ path: 'eft-slack-install2-1.png', fullPage: true }).catch(() => {});

    const allowBtn = target.getByRole('button', { name: 'Allow', exact: true });
    if (await allowBtn.count().catch(() => 0)) {
      await allowBtn.click();
      await target.waitForTimeout(2500);
    }
    console.log('TARGET_URL_FINAL', target.url());
    await target.screenshot({ path: 'eft-slack-install2-2.png', fullPage: true }).catch(() => {});

    await page.goto(`https://api.slack.com/apps/${APP_ID}/oauth`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText();
    console.log('BODY_OAUTH', bodyText.slice(0, 2000));
    await page.screenshot({ path: 'eft-slack-oauth-page2.png', fullPage: true });
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await context.close();
  }
})();
