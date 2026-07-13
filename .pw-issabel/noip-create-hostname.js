// noip-create-hostname.js - Login no-ip y crea hostname cuy5132-oyanedel.ddns.net.
const { chromium } = require('playwright');
const fs = require('fs');

const EMAIL = 'mat.oyanedel@duocuc.cl';
const PASSWORD = process.env.ACCOUNT_PASSWORD || 'REDACTED';
const HOSTNAME = 'cuy5132-oyanedel';
const DOMAIN = 'ddns.net';
const TARGET_IP = process.env.TARGET_IP || '127.0.0.1';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('ERR:', m.text()); });

  try {
    console.log('=== noip login ===');
    await page.goto('https://www.noip.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'noip-login-1.png' });

    const ins = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, id: e.id })));
    console.log('INPUTS login:', JSON.stringify(ins));

    // Llenar
    const tryFill = async (selectors, value) => {
      for (const s of selectors) {
        if (await page.$(s)) {
          try { await page.fill(s, value); return true; } catch {}
        }
      }
      return false;
    };
    await tryFill(['input[name="username"]', 'input[name="email"]', 'input[type="email"]'], EMAIL);
    await tryFill(['input[name="password"]', 'input[type="password"]'], PASSWORD);

    const sb = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
    if (sb) {
      await Promise.all([
        page.waitForLoadState('domcontentloaded', { timeout: 30000 }),
        sb.click()
      ]);
      await page.waitForTimeout(5000);
    }
    await page.screenshot({ path: 'noip-login-2.png' });
    console.log('Despues login - URL:', page.url(), '- Title:', await page.title());

    // Si nos pide confirm email, no podemos proceder.
    if (page.url().includes('confirm') || (await page.content()).toLowerCase().includes('please confirm')) {
      console.log('REQUIERE confirmacion email. Detener.');
      fs.writeFileSync('noip-result.json', JSON.stringify({
        status: 'pending_email_confirm',
        url: page.url(),
        title: await page.title()
      }, null, 2));
      return;
    }

    // Ir a DNS Records / Hostnames
    console.log('\n=== Crear hostname ===');
    await page.goto('https://my.noip.com/dynamic-dns/hostnames', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'noip-hostnames-1.png', fullPage: true });
    console.log('Hostnames page - URL:', page.url());

    // Click "Create Hostname" / "Crear nombre de host"
    let createBtn = await page.$('a:has-text("Create Hostname")')
                || await page.$('button:has-text("Create Hostname")')
                || await page.$('a:has-text("Crear nombre")')
                || await page.$('button:has-text("Crear")')
                || await page.$('a[href*="create"]');
    if (createBtn) {
      await createBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: 'noip-hostnames-2-form.png', fullPage: true });

    // Llenar form: hostname + domain dropdown + IP
    const inputs2 = await page.$$eval('input,select', els => els.map(e => ({
      type: e.type || e.tagName, name: e.name, id: e.id, placeholder: e.placeholder
    })));
    console.log('INPUTS hostname form:', JSON.stringify(inputs2, null, 2));

    await tryFill(['input[name="hostname"]', 'input[id*="hostname"]', 'input[placeholder*="ostname" i]'], HOSTNAME);

    // Domain selector
    try {
      await page.selectOption('select[name="domain"]', { label: DOMAIN });
    } catch {
      try { await page.selectOption('select[name="domain"]', DOMAIN); } catch {}
    }

    // IP
    await tryFill(['input[name="ip"]', 'input[name="ipv4"]', 'input[id*="ip"]'], TARGET_IP);

    await page.screenshot({ path: 'noip-hostnames-3-filled.png' });

    // Submit
    const sb2 = await page.$('button:has-text("Create")')
             || await page.$('button:has-text("Save")')
             || await page.$('button[type="submit"]')
             || await page.$('input[type="submit"]');
    if (sb2) {
      await Promise.all([
        page.waitForLoadState('domcontentloaded', { timeout: 30000 }),
        sb2.click()
      ]);
      await page.waitForTimeout(4000);
    }
    await page.screenshot({ path: 'noip-hostnames-4-saved.png', fullPage: true });

    fs.writeFileSync('noip-result.json', JSON.stringify({
      status: 'ok',
      hostname: `${HOSTNAME}.${DOMAIN}`,
      target_ip: TARGET_IP,
      url: page.url()
    }, null, 2));
    console.log('\nDONE hostname creado:', `${HOSTNAME}.${DOMAIN}`);

  } catch (err) {
    console.error('FATAL:', err.message);
    await page.screenshot({ path: 'noip-FATAL.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
