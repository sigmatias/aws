// signup-openrouter.js - Registra cuenta OpenRouter y crea API key.
const { chromium } = require('playwright');
const fs = require('fs');

const EMAIL = 'mat.oyanedel@duocuc.cl';
const PASSWORD = process.env.ACCOUNT_PASSWORD || 'REDACTED';
const FIRST_NAME = 'Matias';
const LAST_NAME = 'Oyanedel';

(async () => {
  const browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('ERR:', m.text()); });
  page.on('response', async response => {
    if (response.status() >= 400) {
      let body = '';
      try { body = (await response.text()).slice(0, 1500); } catch {}
      console.log(`HTTP_ERROR ${response.status()} ${response.url()} ${body}`);
    }
  });

  try {
    console.log('=== OpenRouter signup ===');
    await page.goto('https://openrouter.ai/sign-up', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'or-1-signup.png', fullPage: false });
    console.log('URL:', page.url(), '| Title:', await page.title());

    const inputs = await page.$$eval('input', els => els.map(e => ({
      type: e.type, name: e.name, id: e.id, placeholder: e.placeholder
    })));
    console.log('INPUTS:', JSON.stringify(inputs, null, 2));

    const buttons = await page.$$eval('button,a',
      els => els.slice(0, 20).map(e => ({ tag: e.tagName, text: e.textContent?.trim()?.slice(0,40) })));
    console.log('BUTTONS:', JSON.stringify(buttons, null, 2));

    // OpenRouter usa OAuth (Google/GitHub) o email/password.
    // Buscar el flow email/password.
    const emailIn = await page.$('input[type="email"]') || await page.$('input[name*="email" i]');
    const passIn = await page.$('input[type="password"]');
    if (emailIn && passIn) {
      await page.fill('input[name="firstName"]', FIRST_NAME);
      await page.fill('input[name="lastName"]', LAST_NAME);
      await emailIn.fill(EMAIL);
      await passIn.fill(PASSWORD);
      await page.check('input[name="legalAccepted"]');
      await page.screenshot({ path: 'or-2-filled.png' });
      let sb = page.getByRole('button', { name: 'Continue', exact: true });
      if (await sb.count() === 0) {
        sb = page.locator('button[type="submit"]:visible').first();
      }
      if (await sb.count()) {
        await sb.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'or-3-after.png', fullPage: true });
        console.log('Despues submit - URL:', page.url(), '| Title:', await page.title());
        console.log('BODY:', (await page.locator('body').innerText()).slice(0, 2500));
        await ctx.storageState({ path: 'openrouter-state.json' });
      }
    } else {
      console.log('No email/pass form visible. OpenRouter probablemente requiere OAuth (Google/GitHub).');
    }

    fs.writeFileSync('openrouter-result.json', JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      url: page.url(),
      title: await page.title()
    }, null, 2));

  } catch (err) {
    console.error('FATAL:', err.message);
    await page.screenshot({ path: 'or-FATAL.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('DONE');
  }
})();
