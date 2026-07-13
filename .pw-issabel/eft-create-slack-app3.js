// eft-create-slack-app3.js - Continua desde "Pick a workspace": selecciona
// Duocuc, pega el manifest YAML y crea la app.
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

    // Step 1: elegir workspace
    await page.locator('select, [role="combobox"]').first().selectOption({ label: 'Duocuc' }).catch(async () => {
      // Combobox React custom: abrir, tipear para filtrar y confirmar con teclado.
      await page.getByText('Select a workspace').click();
      await page.waitForTimeout(500);
      await page.keyboard.type('Duocuc', { delay: 50 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'eft-slack-app3-dropdown-typed.png', fullPage: true });
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'eft-slack-app3-step1.png', fullPage: true });

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-slack-app3-step2.png', fullPage: true });

    // Step 2: editor CodeMirror con tabs JSON/YAML. Cambiar a YAML y setear
    // el valor via la API de CodeMirror (evita que el auto-indent del editor
    // rompa la indentacion al simular tecleo caracter por caracter).
    await page.getByRole('tab', { name: 'YAML', exact: true }).click();
    await page.waitForTimeout(500);
    await page.evaluate((yaml) => {
      const el = document.querySelector('.CodeMirror');
      if (el && el.CodeMirror) {
        el.CodeMirror.setValue(yaml);
      } else {
        throw new Error('CodeMirror instance no encontrada en el DOM');
      }
    }, manifestYaml);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'eft-slack-app3-step2-filled.png', fullPage: true });

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-slack-app3-step3.png', fullPage: true });

    const bodyText = await page.locator('body').innerText();
    console.log('BODY_STEP3', bodyText.slice(0, 1000));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-slack-app3-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
