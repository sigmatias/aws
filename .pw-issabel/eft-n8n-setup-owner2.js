const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: true },
  );
  const page = context.pages()[0] || await context.newPage();
  try {
    await page.goto('https://3.219.120.166.nip.io/setup', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.fill('#emailOrLdapLoginId', 'mat.oyanedel@duocuc.cl');
    await page.fill('#password', 'EftCitas2026!');
    await page.waitForTimeout(500);

    const allInputs = await page.$$eval('input', els => els.map(e => ({name: e.name, id: e.id, value: e.value})));
    console.log('INPUTS_AFTER_FILL', JSON.stringify(allInputs));

    const firstName = page.locator('#firstName');
    if (await firstName.count()) {
      await firstName.fill('Matias');
      await page.locator('#lastName').fill('Oyanedel');
    }
    await page.screenshot({ path: 'eft-n8n-setup2-filled.png', fullPage: true });

    const nextBtn = page.locator('button:has-text("Next"), button[type="submit"]').first();
    await nextBtn.click({ timeout: 5000 });
    await page.waitForTimeout(3000);
    console.log('URL_AFTER', page.url());
    await page.screenshot({ path: 'eft-n8n-setup2-after.png', fullPage: true });
    const bodyText = await page.locator('body').innerText();
    console.log('BODY_AFTER', bodyText.slice(0, 400));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-n8n-setup2-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
