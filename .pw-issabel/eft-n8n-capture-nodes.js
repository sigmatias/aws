// eft-n8n-capture-nodes.js - Doble click por texto (Playwright locator, no
// coordenadas de pantalla) en cada nodo clave y captura de su panel.
// Screenshots propios (no dependen de posicion de ventana en pantalla).
const path = require('path');
const { chromium } = require('playwright');

const OUT_DIR = path.join(__dirname, '..', 'informe', 'capturas_eft');

const NODES = [
  { id: 'webhook-citas-001', file: 'captura_18.png' },
  { id: 'http-get-cita-001', file: 'captura_19.png' },
  { id: 'http-ia-001', file: 'captura_20.png' },
  { id: 'http-tts-001', file: 'captura_21.png' },
  { id: 'http-update-estado-001', file: 'captura_22.png' },
  { id: 'http-slack-001', file: 'captura_23.png' },
];

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: true, viewport: { width: 1600, height: 1000 } },
  );
  const page = context.pages()[0] || await context.newPage();
  try {
    await page.goto('https://3.219.120.166.nip.io/workflow/eft-citas-cuy5132-001', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(4000);

    for (const { id, file } of NODES) {
      try {
        const el = page.locator(`.vue-flow__node[data-id="${id}"]`).first();
        await el.dblclick({ timeout: 8000, force: true });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: false });
        console.log(`OK ${id} -> ${file}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
      } catch (err) {
        console.log(`FALLO ${id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await context.close();
  }
})();
