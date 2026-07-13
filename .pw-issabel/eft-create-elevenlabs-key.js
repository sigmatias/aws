// eft-create-elevenlabs-key.js - Crea una nueva API key de ElevenLabs
// nombrada "eft-cuy5132" y extrae su valor completo (solo se muestra una vez).
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
    await page.goto('https://elevenlabs.io/app/developers/api-keys', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    await page.getByText('Crear clave', { exact: true }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-el-create-1.png', fullPage: true });

    // Buscar campo de nombre y llenarlo
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.count()) {
      await nameInput.fill('eft-cuy5132');
    }
    await page.screenshot({ path: 'eft-el-create-2.png', fullPage: true });

    // Buscar boton de continuar/crear dentro del modal
    const createBtns = ['button:has-text("Create")', 'button:has-text("Crear")', 'button:has-text("Next")', 'button:has-text("Siguiente")'];
    for (const sel of createBtns) {
      const btn = page.locator(sel).last();
      if (await btn.count()) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(1500);
      }
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-el-create-3.png', fullPage: true });

    const bodyText = await page.locator('body').innerText();
    console.log('BODY_AFTER_CREATE', bodyText.slice(0, 2500));

    // Intentar encontrar un input/codigo con el valor completo de la key (sk_...)
    const candidates = await page.locator('input, code, [class*="key"]').allTextContents().catch(() => []);
    const inputValues = await page.$$eval('input', els => els.map(e => e.value)).catch(() => []);
    console.log('INPUT_VALUES', JSON.stringify(inputValues));
    console.log('CANDIDATE_TEXTS', JSON.stringify(candidates.filter(t => t && t.includes('sk_'))));
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await browser.close();
  }
})();
