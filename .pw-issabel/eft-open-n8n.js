const { launchOnSecondScreen } = require('./second-screen');

(async () => {
  const { page } = await launchOnSecondScreen();
  try {
    await page.goto('https://3.219.120.166.nip.io/workflow/eft-citas-cuy5132-001', {
      waitUntil: 'domcontentloaded', timeout: 45000,
    });
    await page.waitForTimeout(4000);
    console.log('URL', page.url());
  } catch (err) {
    console.error('ERROR', err.message);
  }
})();
