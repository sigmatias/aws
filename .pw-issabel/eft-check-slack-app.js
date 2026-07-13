// eft-check-slack-app.js - Revisa la pagina de apps instaladas del workspace
// activo para confirmar si n8n-cuy5132 (creada en EP3) sigue instalada.
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(__dirname, 'eft-login-state.json'),
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto('https://app.slack.com/client/T0BDPHMPS5U', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    await page.goto('https://duocuc.slack.com/apps/manage', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(async () => {
      await page.goto('https://app.slack.com/app-settings/T0BDPHMPS5U', {
        waitUntil: 'domcontentloaded', timeout: 30000,
      }).catch(() => {});
    });
    await page.waitForTimeout(3000);
    console.log(`URL ${page.url()}`);
    const body = await page.locator('body').innerText();
    console.log('CONTIENE_n8n-cuy5132:', body.includes('n8n-cuy5132'));
    await page.screenshot({ path: 'eft-slack-apps.png', fullPage: true });
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await browser.close();
  }
})();
