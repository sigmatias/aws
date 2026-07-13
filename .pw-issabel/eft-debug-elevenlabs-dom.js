const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: true },
  );
  const page = await context.newPage();
  try {
    await page.goto('https://elevenlabs.io/app/developers/api-keys', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(2000);
    await page.getByText('Crear clave', { exact: true }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-debug-modal.png', fullPage: true });

    // Listar todos los botones visibles con su texto e indice
    const buttons = await page.$$eval('button', els => els.map((e, i) => ({
      i, text: e.textContent.trim().slice(0, 30), visible: e.offsetParent !== null,
    })).filter(b => b.visible));
    console.log('BUTTONS', JSON.stringify(buttons, null, 1));
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await context.close();
  }
})();
