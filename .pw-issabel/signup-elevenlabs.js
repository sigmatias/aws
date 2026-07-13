const { chromium } = require('playwright');

const EMAIL = process.env.ACCOUNT_EMAIL;
const PASSWORD = process.env.ACCOUNT_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error('ACCOUNT_EMAIL and ACCOUNT_PASSWORD are required');
}

(async () => {
  const browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.on('response', async response => {
    if (response.status() >= 400) {
      let body = '';
      try { body = (await response.text()).slice(0, 1500); } catch {}
      console.log(`HTTP_ERROR ${response.status()} ${response.url()} ${body}`);
    }
  });

  try {
    await page.goto('https://elevenlabs.io/app/sign-up', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(4000);

    console.log(`START_URL ${page.url()}`);
    console.log(`INPUTS ${JSON.stringify(await page.$$eval('input', els => els.map(e => ({
      type: e.type,
      name: e.name,
      id: e.id,
      placeholder: e.placeholder,
    }))), null, 2)}`);

    const bodyBefore = await page.locator('body').innerText();
    if (/captcha|not a robot|verify you are human/i.test(bodyBefore)) {
      console.log('CAPTCHA_PRESENT');
      await page.screenshot({ path: 'elevenlabs-captcha.png', fullPage: true });
      return;
    }

    const email = page.locator('input[type="email"], input[name*="email" i]').first();
    const password = page.locator('input[type="password"], input[name*="password" i]').first();
    if (!await email.count() || !await password.count()) {
      console.log(`NO_EMAIL_PASSWORD_FORM\n${bodyBefore.slice(0, 2500)}`);
      await page.screenshot({ path: 'elevenlabs-no-form.png', fullPage: true });
      return;
    }

    await email.fill(EMAIL);
    await password.fill(PASSWORD);

    for (const checkbox of await page.locator('input[type="checkbox"]').all()) {
      if (await checkbox.isVisible() && !await checkbox.isChecked()) {
        await checkbox.check();
      }
    }

    const submit = page.getByRole('button', { name: 'Sign up', exact: true });
    await submit.click();
    await page.waitForTimeout(20000);

    console.log(`RESULT_URL ${page.url()}`);
    console.log(`BODY ${(await page.locator('body').innerText()).slice(0, 3000)}`);
    await page.screenshot({ path: 'elevenlabs-result.png', fullPage: true });
    await context.storageState({ path: 'elevenlabs-state.json' });
  } finally {
    await browser.close();
  }
})();
