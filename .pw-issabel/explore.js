// explore.js - Pass 1: explorar UI Issabel (login + screenshots de cada pantalla relevante)
const { chromium } = require('playwright');

const IP = process.env.ISSABEL_IP || '98.80.98.126';
const URL = `https://${IP}:4443`;

(async () => {
  console.log(`Conectando a ${URL}...`);
  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('PAGEERR:', err.message));

  // 1. Login page
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.error('Error navegando:', e.message);
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '01-login.png', fullPage: true });
  console.log('URL despues de goto:', page.url());
  console.log('Title:', await page.title());

  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type, name: e.name, id: e.id, placeholder: e.placeholder
  })));
  console.log('INPUTS login:', JSON.stringify(inputs));
  const forms = await page.$$eval('form', els => els.map(e => ({ action: e.action, method: e.method })));
  console.log('FORMS:', JSON.stringify(forms));

  // 2. Login
  try {
    if (await page.$('input[name="input_user"]')) {
      await page.fill('input[name="input_user"]', 'admin');
      await page.fill('input[name="input_pass"]', 'issabel-4');
    } else if (await page.$('input[name="username"]')) {
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'issabel-4');
    }
    const submitBtn = await page.$('input[type="submit"]') || await page.$('button[type="submit"]') || await page.$('button');
    if (submitBtn) {
      await Promise.all([
        page.waitForLoadState('domcontentloaded', { timeout: 15000 }),
        submitBtn.click()
      ]);
    }
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('Error login:', e.message);
  }

  await page.screenshot({ path: '02-after-login.png', fullPage: true });
  console.log('Despues login - URL:', page.url());
  console.log('Despues login - Title:', await page.title());

  // 3. PBX Configuration directamente
  try {
    await page.goto(`${URL}/index.php?menu=pbxconfig`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('Error nav pbxconfig:', e.message);
  }
  await page.screenshot({ path: '03-pbxconfig.png', fullPage: true });
  console.log('PBXconfig - URL:', page.url());

  const frames = page.frames();
  console.log('FRAMES tras pbxconfig:', frames.length);
  for (const f of frames) console.log('  frame:', f.name(), '-', f.url());

  await browser.close();
  console.log('DONE');
})().catch(err => { console.error('FATAL:', err); process.exit(1); });
