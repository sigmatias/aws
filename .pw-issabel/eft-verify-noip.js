// eft-verify-noip.js - Reabre con el storageState guardado y confirma si
// no-ip realmente quedo autenticado (dashboard) o si el login fallo.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(__dirname, 'eft-login-state.json'),
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto('https://my.noip.com/dynamic-dns', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    console.log(`URL ${page.url()}`);
    console.log(`TITLE ${await page.title()}`);
    await page.screenshot({ path: 'eft-noip-verify.png', fullPage: true });
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await browser.close();
  }
})();
