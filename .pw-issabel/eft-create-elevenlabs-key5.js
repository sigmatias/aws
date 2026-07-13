// eft-create-elevenlabs-key5.js - "Sin acceso" matcheaba por substring
// ("acceso" case-insensitive). Uso getByRole exact:true + .first(), que
// devuelve el primer boton con nombre EXACTO "Acceso" (fila "De texto a voz").
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

    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.count()) await nameInput.fill('eft-cuy5132');

    const accesoBtn = page.getByRole('button', { name: 'Acceso', exact: true }).first();
    await accesoBtn.click({ timeout: 8000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'eft-el-create5-1.png', fullPage: true });

    const finalBtn = page.locator('button:has-text("Crear clave")').last();
    await finalBtn.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'eft-el-create5-2.png', fullPage: true });

    const inputValues = await page.$$eval('input', els => els.map(e => e.value)).catch(() => []);
    console.log('INPUT_VALUES', JSON.stringify(inputValues));
    const codeTexts = await page.$$eval('code, pre, [class*="mono"]', els => els.map(e => e.textContent)).catch(() => []);
    console.log('CODE_TEXTS', JSON.stringify(codeTexts));
    const bodyText = await page.locator('body').innerText();
    console.log('BODY_AFTER', bodyText.slice(0, 900));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-el-create5-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
