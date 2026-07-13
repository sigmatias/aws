// eft-slack-install3.js - "Install to Duocuc" es un <a>, no <button> (por eso
// getByRole('button',...) nunca lo encontraba). Se navega directo a su href.
const path = require('path');
const { chromium } = require('playwright');

const APP_ID = 'A0BH2SK9J9J';
const OAUTH_URL = 'https://slack.com/oauth/v2/authorize?client_id=11465599808198.11580903324324&team=T0BDPHMPS5U&install_redirect=install-on-team&scope=app_mentions:read,channels:history,channels:read,chat:write,groups:history,groups:read,im:history,im:read,im:write,users:read';

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: true },
  );
  const page = await context.newPage();
  try {
    await page.goto(OAUTH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    console.log('URL_1', page.url());
    await page.screenshot({ path: 'eft-slack-install3-1.png', fullPage: true });

    const allowBtn = page.getByRole('button', { name: 'Allow', exact: true });
    if (await allowBtn.count().catch(() => 0)) {
      await allowBtn.click();
      await page.waitForTimeout(2500);
    }
    console.log('URL_2', page.url());
    await page.screenshot({ path: 'eft-slack-install3-2.png', fullPage: true });

    await page.goto(`https://api.slack.com/apps/${APP_ID}/oauth`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText();
    console.log('BODY_OAUTH', bodyText.slice(0, 2000));
    await page.screenshot({ path: 'eft-slack-oauth-page3.png', fullPage: true });
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await context.close();
  }
})();
