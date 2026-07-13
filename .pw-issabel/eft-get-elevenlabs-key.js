// eft-get-elevenlabs-key.js - Usa la sesion ya logueada para entrar a
// Settings > API Keys, crear una key nueva si hace falta y extraer su valor.
const fs = require('fs');
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
    await page.goto('https://elevenlabs.io/app/settings/api-keys', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    console.log(`URL ${page.url()}`);
    await page.screenshot({ path: 'eft-elevenlabs-apikeys.png', fullPage: true });

    const bodyText = await page.locator('body').innerText();
    console.log('BODY_PREVIEW', bodyText.slice(0, 1500));
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await browser.close();
  }
})();
