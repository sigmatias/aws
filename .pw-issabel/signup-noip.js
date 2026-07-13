// signup-noip.js - Registra cuenta no-ip y crea hostname cuy5132-oyanedel.ddns.net.
const { chromium } = require('playwright');
const fs = require('fs');

const EMAIL = 'mat.oyanedel@duocuc.cl';
const PASSWORD = process.env.ACCOUNT_PASSWORD || 'REDACTED';
const USERNAME = 'cuy5132oyanedel';
const HOSTNAME_PREFIX = 'cuy5132-oyanedel';
const HOSTNAME_DOMAIN = 'ddns.net';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('BROWSER ERR:', m.text()); });

  try {
    console.log('=== no-ip signup ===');
    await page.goto('https://www.noip.com/sign-up', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'noip-1-signup.png', fullPage: false });

    // Inspeccionar campos
    const inputs = await page.$$eval('input', els => els.map(e => ({
      type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, required: e.required
    })));
    console.log('INPUTS form signup:', JSON.stringify(inputs, null, 2));

    // Cerrar posibles cookies/popups
    try { await page.click('button:has-text("Accept")', { timeout: 2000 }); } catch {}
    try { await page.click('button:has-text("Acepto")', { timeout: 2000 }); } catch {}

    // Llenar form con selectores tipicos
    const tryFill = async (selectors, value) => {
      for (const s of selectors) {
        if (await page.$(s)) {
          try { await page.fill(s, value); console.log(`  fill ${s} = ${value.slice(0, 20)}...`); return true; } catch {}
        }
      }
      return false;
    };

    await tryFill(['input[name="email"]', 'input[type="email"]', 'input[name="username"]'], EMAIL);
    await tryFill(['input[name="password"]', 'input[type="password"]:not([name*="confirm"])'], PASSWORD);
    await tryFill(['input[name="passwordConfirm"]', 'input[name="password_confirm"]', 'input[name="password2"]', 'input[type="password"]:nth-of-type(2)'], PASSWORD);

    // Hostname (a veces lo piden en el signup, a veces despues)
    await tryFill(['input[name="hostname"]', 'input[id*="hostname"]'], HOSTNAME_PREFIX);

    // Submit
    await page.screenshot({ path: 'noip-2-filled.png', fullPage: false });

    const submit = await page.$('button[type="submit"]:has-text("Free")')
                || await page.$('button[type="submit"]:has-text("Sign Up")')
                || await page.$('button[type="submit"]')
                || await page.$('input[type="submit"]');
    if (submit) {
      await Promise.all([
        page.waitForLoadState('domcontentloaded', { timeout: 30000 }),
        submit.click()
      ]);
      await page.waitForTimeout(5000);
    } else {
      console.log('WARN: no submit btn');
    }

    await page.screenshot({ path: 'noip-3-after-submit.png', fullPage: true });
    console.log('Despues submit - URL:', page.url(), '- Title:', await page.title());

    // Guardar credenciales
    fs.writeFileSync('noip-creds.json', JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      hostname_target: `${HOSTNAME_PREFIX}.${HOSTNAME_DOMAIN}`,
      signup_url: page.url(),
      signup_title: await page.title()
    }, null, 2));

  } catch (err) {
    console.error('FATAL:', err.message);
    await page.screenshot({ path: 'noip-FATAL.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('DONE');
  }
})();
