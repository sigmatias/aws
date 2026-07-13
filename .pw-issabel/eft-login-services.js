// eft-login-services.js - Abre 4 pestanas (ElevenLabs, Slack, OpenRouter, No-IP)
// en el monitor secundario para que el usuario se loguee manualmente. Sondea
// cada pestana hasta detectar que salio de la URL de login (o timeout), guarda
// storageState para reuso futuro y deja constancia en eft-login-status.json.
const fs = require('fs');
const path = require('path');
const { launchOnSecondScreen } = require('./second-screen');

const SERVICES = [
  { name: 'elevenlabs', url: 'https://elevenlabs.io/app/sign-in', loginPattern: /sign-in|login/i },
  { name: 'slack', url: 'https://slack.com/signin', loginPattern: /signin|get-started/i },
  { name: 'openrouter', url: 'https://openrouter.ai/sign-in', loginPattern: /sign-in/i },
  { name: 'noip', url: 'https://www.noip.com/login', loginPattern: /login/i },
];

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos para que el usuario se loguee en las 4
const POLL_MS = 5000;

(async () => {
  const { context } = await launchOnSecondScreen();
  const pages = [];
  for (const svc of SERVICES) {
    const page = await context.newPage();
    await page.goto(svc.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => {
      console.log(`GOTO_ERROR ${svc.name} ${e.message}`);
    });
    pages.push({ ...svc, page });
  }
  // Dejar la primera pestana (elevenlabs) activa/al frente.
  await pages[0].page.bringToFront();

  console.log('Pestanas abiertas en la segunda pantalla. Esperando login manual (hasta 10 min)...');

  const deadline = Date.now() + TIMEOUT_MS;
  const status = {};
  const pending = new Set(pages.map((p) => p.name));

  while (pending.size > 0 && Date.now() < deadline) {
    for (const svc of pages) {
      if (!pending.has(svc.name)) continue;
      const url = svc.page.url();
      if (!svc.loginPattern.test(url)) {
        status[svc.name] = { loggedIn: true, url };
        pending.delete(svc.name);
        console.log(`OK ${svc.name} -> ${url}`);
      }
    }
    if (pending.size > 0) await new Promise((r) => setTimeout(r, POLL_MS));
  }

  for (const svc of pages) {
    if (pending.has(svc.name)) {
      status[svc.name] = { loggedIn: false, url: svc.page.url() };
      console.log(`TIMEOUT ${svc.name} -> sigue en ${svc.page.url()}`);
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'eft-login-status.json'),
    JSON.stringify(status, null, 2),
  );
  await context.storageState({ path: path.join(__dirname, 'eft-login-state.json') });

  console.log('RESUMEN', JSON.stringify(status));
  await context.close();
})();
