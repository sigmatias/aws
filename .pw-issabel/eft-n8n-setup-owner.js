const { launchOnSecondScreen } = require('./second-screen');

(async () => {
  const { page } = await launchOnSecondScreen();
  try {
    await page.goto('https://3.219.120.166.nip.io/setup', {
      waitUntil: 'domcontentloaded', timeout: 45000,
    });
    await page.waitForTimeout(2500);
    console.log('URL_1', page.url());

    const email = page.locator('input[name="email"]');
    if (await email.count()) {
      await email.fill('mat.oyanedel@duocuc.cl');
      await page.locator('input[name="firstName"]').fill('Matias');
      await page.locator('input[name="lastName"]').fill('Oyanedel');
      await page.locator('input[name="password"]').fill('EftCitas2026!');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'eft-n8n-setup-filled.png', fullPage: true });

      const submitBtn = page.locator('button[type="submit"], button:has-text("Next"), button:has-text("Siguiente")').first();
      await submitBtn.click({ timeout: 5000 }).catch((e) => console.log('WARN submit:', e.message));
      await page.waitForTimeout(3000);
    }
    console.log('URL_2', page.url());
    await page.screenshot({ path: 'eft-n8n-setup-after.png', fullPage: true });
    const bodyText = await page.locator('body').innerText();
    console.log('BODY', bodyText.slice(0, 500));
  } catch (err) {
    console.error('ERROR', err.message);
  }
})();
