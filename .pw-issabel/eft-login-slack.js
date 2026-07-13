// eft-login-slack.js - Reintenta solo Slack, reusando la sesion parcial
// guardada, y espera hasta 8 minutos a que el usuario complete el login
// (incluida la seleccion de workspace).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROFILE_DIR = path.join(__dirname, 'chrome-ep3-profile');
const SCREEN = { x: -1366, y: 336, width: 1366, height: 768 };
const TIMEOUT_MS = 8 * 60 * 1000;
const POLL_MS = 5000;
const loginPattern = /signin|get-started/i;

(async () => {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: null,
    args: [
      `--window-position=${SCREEN.x},${SCREEN.y}`,
      `--window-size=${SCREEN.width},${SCREEN.height}`,
      '--ignore-certificate-errors',
    ],
  });
  const page = context.pages()[0] || (await context.newPage());
  await page.goto('https://slack.com/signin', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.bringToFront();
  console.log('Pestana Slack abierta en la segunda pantalla. Esperando login (hasta 8 min)...');

  const deadline = Date.now() + TIMEOUT_MS;
  let ok = false;
  while (Date.now() < deadline) {
    const url = page.url();
    if (!loginPattern.test(url)) {
      ok = true;
      console.log(`OK slack -> ${url}`);
      break;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  if (!ok) console.log(`TIMEOUT slack -> sigue en ${page.url()}`);

  await context.storageState({ path: path.join(__dirname, 'eft-login-state.json') });
  fs.writeFileSync(
    path.join(__dirname, 'eft-login-slack-status.json'),
    JSON.stringify({ loggedIn: ok, url: page.url() }, null, 2),
  );
  await context.close();
})();
