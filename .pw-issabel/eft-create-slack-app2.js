// eft-create-slack-app2.js - Flujo completo: Create New App -> From manifest
// -> elegir workspace Duocuc -> pegar YAML -> revisar -> crear.
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
    await page.waitForTimeout(2000);

    await page.locator('[data-qa="create_new_app_button"]').click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-slack-app2-1.png', fullPage: true });

    await page.getByText('From a manifest', { exact: true }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-slack-app2-2.png', fullPage: true });

    const bodyText = await page.locator('body').innerText();
    console.log('BODY_AFTER_MANIFEST_CLICK', bodyText.slice(0, 800));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-slack-app2-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
