// eft-slack-install.js - Instala la app en el workspace (OAuth authorize)
// y extrae el Bot User OAuth Token + Signing Secret.
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
    await page.screenshot({ path: 'eft-slack-install-1.png', fullPage: true });
    console.log('URL_1', page.url());

    const installBtn = page.getByRole('button', { name: /Install to|Allow/i }).first();
    if (await installBtn.count()) {
      await installBtn.click();
      await page.waitForTimeout(2500);
    }
    await page.screenshot({ path: 'eft-slack-install-2.png', fullPage: true });
    console.log('URL_2', page.url());

    // A veces pide un segundo "Allow" en pantalla de permisos OAuth
    const allowBtn = page.getByRole('button', { name: 'Allow', exact: true });
    if (await allowBtn.count()) {
      await allowBtn.click();
      await page.waitForTimeout(2500);
    }
    await page.screenshot({ path: 'eft-slack-install-3.png', fullPage: true });
    console.log('URL_3', page.url());

    await page.goto(`https://api.slack.com/apps/${APP_ID}/oauth`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText();
    console.log('BODY_OAUTH', bodyText.slice(0, 1500));
    await page.screenshot({ path: 'eft-slack-oauth-page.png', fullPage: true });
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-slack-install-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
