// eft-slack-install4.js - UI en espanol: el boton es "Permitir", no "Allow".
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
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Permitir', exact: true }).click();
    await page.waitForTimeout(3000);
    console.log('URL_AFTER_PERMITIR', page.url());
    await page.screenshot({ path: 'eft-slack-install4-1.png', fullPage: true });

    await page.goto(`https://api.slack.com/apps/${APP_ID}/oauth`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText();
    console.log('BODY_OAUTH', bodyText.slice(0, 2500));
    await page.screenshot({ path: 'eft-slack-oauth-page4.png', fullPage: true });

    // Extraer el Bot Token via boton "Copy" si existe un input/campo con el valor
    const inputValues = await page.$$eval('input', els => els.map(e => ({ name: e.name, value: e.value }))).catch(() => []);
    console.log('INPUTS', JSON.stringify(inputValues));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-slack-install4-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
