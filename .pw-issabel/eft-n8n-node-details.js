// eft-n8n-node-details.js - Abre el workflow, hace doble click en cada nodo
// clave para mostrar su panel de configuracion, y en la ultima ejecucion
// abre el panel de Output de los nodos finales.
const path = require('path');
const { chromium } = require('playwright');

const NODES_CONFIG = ['Webhook Citas', 'Obtener Cita', 'IA Redactar Mensaje', 'Generar Audio TTS', 'Actualizar Estado Cita', 'Notificar Slack'];

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: false, viewport: null,
      args: ['--window-position=-1366,336', '--window-size=1366,768', '--ignore-certificate-errors'] },
  );
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://3.219.120.166.nip.io/workflow/eft-citas-cuy5132-001', {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await page.waitForTimeout(4000);
  console.log('READY', page.url());
})();
