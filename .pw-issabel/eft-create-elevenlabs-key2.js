// eft-create-elevenlabs-key2.js - Corrige el intento anterior: habilita el
// permiso "De texto a voz" antes de crear la key, y extrae el valor final.
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

    // Fila "De texto a voz": el primer bloque de la lista de Endpoints.
    // Su boton "Acceso" es el primero de los pares Sin acceso/Acceso.
    const row = page.locator('text=De texto a voz').first();
    await row.scrollIntoViewIfNeeded().catch(() => {});
    const accesoBtn = page.locator('button:has-text("Acceso")').first();
    await accesoBtn.click({ timeout: 5000 }).catch((e) => console.log('WARN acceso click:', e.message));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'eft-el-create2-1.png', fullPage: true });

    // Boton final "Crear clave" (panel footer)
    const finalBtn = page.locator('button:has-text("Crear clave")').last();
    await finalBtn.click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-el-create2-2.png', fullPage: true });

    const bodyText = await page.locator('body').innerText();
    console.log('BODY_AFTER', bodyText.slice(0, 1200));

    const inputValues = await page.$$eval('input', els => els.map(e => e.value)).catch(() => []);
    console.log('INPUT_VALUES', JSON.stringify(inputValues));

    const codeTexts = await page.$$eval('code, pre, [class*="mono"]', els => els.map(e => e.textContent)).catch(() => []);
    console.log('CODE_TEXTS', JSON.stringify(codeTexts));
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await browser.close();
  }
})();
