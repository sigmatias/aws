// signup-slack.js - Crea cuenta Slack + workspace nuevo "Consultora A&B".
const { chromium } = require('playwright');
const fs = require('fs');

const EMAIL = 'mat.oyanedel@duocuc.cl';
const PASSWORD = process.env.ACCOUNT_PASSWORD || 'REDACTED';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('ERR:', m.text()); });

  try {
    console.log('=== Slack signup (create workspace) ===');
    await page.goto('https://slack.com/get-started#/createnew', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'slack-1.png', fullPage: false });

    const ins = await page.$$eval('input', els => els.map(e => ({
      type: e.type, name: e.name, id: e.id, placeholder: e.placeholder
    })));
    console.log('INPUTS:', JSON.stringify(ins, null, 2));

    // Slack pide solo email; manda codigo de 6 digitos al mail (no password en signup)
    const emailIn = await page.$('input[type="email"]') || await page.$('input[name*="email"]');
    if (emailIn) {
      await emailIn.fill(EMAIL);
      console.log('Email llenado:', EMAIL);
    } else {
      console.log('No email input visible');
    }
    await page.screenshot({ path: 'slack-2-filled.png' });

    const sb = await page.$('button:has-text("Continue")') || await page.$('button[type="submit"]');
    if (sb) {
      await sb.click();
      await page.waitForTimeout(5000);
    }
    await page.screenshot({ path: 'slack-3-after.png', fullPage: true });
    console.log('Despues submit - URL:', page.url(), '| Title:', await page.title());
    console.log('BODY:', (await page.locator('body').innerText()).slice(0, 2500));
    console.log('POST_INPUTS:', JSON.stringify(await page.$$eval('input', els => els.map(e => ({
      type: e.type, name: e.name, id: e.id, placeholder: e.placeholder,
      maxlength: e.maxLength, autocomplete: e.autocomplete
    }))), null, 2));
    await ctx.storageState({ path: 'slack-state.json' });

    fs.writeFileSync('slack-result.json', JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      note: 'Slack envia codigo de 6 digitos al mail. El usuario debe revisar mat.oyanedel@duocuc.cl, abrir el mail de Slack y usar el codigo en https://slack.com/get-started#/createnew',
      url: page.url(),
      title: await page.title()
    }, null, 2));

  } catch (err) {
    console.error('FATAL:', err.message);
    await page.screenshot({ path: 'slack-FATAL.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('DONE');
  }
})();
