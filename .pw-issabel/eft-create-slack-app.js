// eft-create-slack-app.js - Crea la Slack App "eft-cuy5132-citas" a partir
// del manifest YAML, usando la sesion ya logueada en el perfil persistente.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const manifestYaml = fs.readFileSync(
  path.join(__dirname, '..', 'eft', 'slack-app-manifest.yaml'),
  'utf-8',
);

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: true },
  );
  const page = await context.newPage();
  try {
    await page.goto('https://api.slack.com/apps', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(2500);
    console.log('URL_1', page.url());
    await page.screenshot({ path: 'eft-slack-app-1.png', fullPage: true });

    const bodyText1 = await page.locator('body').innerText();
    console.log('BODY_1', bodyText1.slice(0, 400));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-slack-app-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
