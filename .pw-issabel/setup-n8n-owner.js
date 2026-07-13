const { chromium } = require('playwright');

const required = [
  'N8N_URL',
  'N8N_EMAIL',
  'N8N_FIRST_NAME',
  'N8N_LAST_NAME',
  'N8N_PASSWORD',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

async function fillFirst(page, selectors, value) {
  for (const selector of selectors) {
    const field = page.locator(selector).first();
    if (await field.count()) {
      await field.fill(value);
      return selector;
    }
  }
  throw new Error(`No field found for selectors: ${selectors.join(', ')}`);
}

(async () => {
  const launchOptions = { headless: true };
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  if (require('fs').existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  try {
    await page.goto(process.env.N8N_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    if (/signin|login/i.test(page.url())) {
      console.log(`ALREADY_CONFIGURED url=${page.url()}`);
      return;
    }

    await fillFirst(page, [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]',
    ], process.env.N8N_EMAIL);

    await fillFirst(page, [
      'input[name="firstName"]',
      'input[placeholder*="first name" i]',
      'input[placeholder*="nombre" i]',
    ], process.env.N8N_FIRST_NAME);

    await fillFirst(page, [
      'input[name="lastName"]',
      'input[placeholder*="last name" i]',
      'input[placeholder*="apellido" i]',
    ], process.env.N8N_LAST_NAME);

    await fillFirst(page, [
      'input[name="password"]',
      'input[type="password"]',
    ], process.env.N8N_PASSWORD);

    const submit = page.getByRole('button', {
      name: /next|continue|set up|create|start|siguiente|continuar|crear/i,
    }).first();
    await submit.click();
    await page.waitForTimeout(5000);

    console.log(`RESULT url=${page.url()} title=${await page.title()}`);
    console.log(`BODY ${(await page.locator('body').innerText()).slice(0, 1200)}`);
  } catch (error) {
    await page.screenshot({ path: '/home/coleto/pw-ep3/n8n-owner-error.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
})();
