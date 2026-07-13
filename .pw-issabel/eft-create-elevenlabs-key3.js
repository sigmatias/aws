// eft-create-elevenlabs-key3.js - Fix: "Acceso" matcheaba tambien "Sin acceso"
// por substring. Ahora usa exact match dentro de la fila "De texto a voz".
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

    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.count()) await nameInput.fill('eft-cuy5132');

    // Fila que contiene "De texto a voz": subir al contenedor de fila y
    // clickear el boton EXACTO "Acceso" (no "Sin acceso") dentro de esa fila.
    const label = page.getByText('De texto a voz', { exact: true }).last();
    const row = label.locator('xpath=ancestor::*[.//button[text()="Acceso"]][1]').first();
    const accesoBtn = row.getByRole('button', { name: 'Acceso', exact: true });
    await accesoBtn.click({ timeout: 8000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'eft-el-create3-1.png', fullPage: true });

    const finalBtn = page.locator('button:has-text("Crear clave")').last();
    await finalBtn.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'eft-el-create3-2.png', fullPage: true });

    const bodyText = await page.locator('body').innerText();
    console.log('BODY_AFTER', bodyText.slice(0, 1200));

    const inputValues = await page.$$eval('input', els => els.map(e => e.value)).catch(() => []);
    console.log('INPUT_VALUES', JSON.stringify(inputValues));
    const codeTexts = await page.$$eval('code, pre, [class*="mono"]', els => els.map(e => e.textContent)).catch(() => []);
    console.log('CODE_TEXTS', JSON.stringify(codeTexts));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-el-create3-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
