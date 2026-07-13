// eft-n8n-execution-outputs.js - Abre la ejecucion mas reciente exitosa y
// hace click en los nodos finales para mostrar su OUTPUT real (datos de
// salida ya generados por esa corrida, no una nueva ejecucion).
const path = require('path');
const { chromium } = require('playwright');

const OUT_DIR = path.join(__dirname, '..', 'informe', 'capturas_eft');

const NODES = [
  { id: 'http-tts-001', file: 'captura_24.png', label: 'Generar Audio TTS (output real)' },
  { id: 'http-slack-001', file: 'captura_25.png', label: 'Notificar Slack (output real)' },
];

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: true, viewport: { width: 1600, height: 1000 } },
  );
  const page = context.pages()[0] || await context.newPage();
  try {
    await page.goto('https://3.219.120.166.nip.io/workflow/eft-citas-cuy5132-001/executions', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // Click explicito en la primera fila de la lista para forzar la carga.
    const firstRow = page.locator('div').filter({ hasText: /Succeeded in/ }).first();
    await firstRow.click({ timeout: 10000 }).catch((e) => console.log('WARN click fila:', e.message));
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT_DIR, 'captura_23b_lista_executions.png'), fullPage: false });
    const nodeCount = await page.locator('.vue-flow__node').count();
    console.log('nodeCount', nodeCount);

    for (const { id, file, label } of NODES) {
      try {
        const el = page.locator(`.vue-flow__node[data-id="${id}"]`).first();
        await el.dblclick({ timeout: 8000, force: true });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: false });
        console.log(`OK ${label} -> ${file}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
      } catch (err) {
        console.log(`FALLO ${label}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await context.close();
  }
})();
