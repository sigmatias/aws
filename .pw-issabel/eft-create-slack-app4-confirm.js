// eft-create-slack-app4-confirm.js - Repite el flujo completo hasta Step 3
// y esta vez hace click en "Create" para confirmar.
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
    await page.goto('https://api.slack.com/apps', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.locator('[data-qa="create_new_app_button"]').click();
    await page.waitForTimeout(1200);
    await page.getByText('From a manifest', { exact: true }).click();
    await page.waitForTimeout(1200);

    await page.getByText('Select a workspace').click();
    await page.waitForTimeout(500);
    await page.keyboard.type('Duocuc', { delay: 50 });
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(1500);

    await page.getByRole('tab', { name: 'YAML', exact: true }).click();
    await page.waitForTimeout(500);
    await page.evaluate((yaml) => {
      const el = document.querySelector('.CodeMirror');
      el.CodeMirror.setValue(yaml);
    }, manifestYaml);
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForTimeout(4000);
    console.log('URL_FINAL', page.url());
    await page.screenshot({ path: 'eft-slack-app-created.png', fullPage: true });

    const bodyText = await page.locator('body').innerText();
    console.log('BODY_FINAL', bodyText.slice(0, 1500));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-slack-app4-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
