// eft-check-elevenlabs.js - Verifica si la sesion persistida de ElevenLabs
// (perfil chrome-ep3-profile) sigue vigente, y si es asi, entra a
// Settings > API Keys para dejar la pantalla lista para generar/copiar una key.
const { launchOnSecondScreen } = require('./second-screen');

(async () => {
  const { context, page } = await launchOnSecondScreen();
  try {
    await page.goto('https://elevenlabs.io/app/home', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(4000);
    const url = page.url();
    console.log(`URL_FINAL ${url}`);

    const loggedIn = !/sign-in|login/i.test(url);
    console.log(`LOGGED_IN ${loggedIn}`);

    if (loggedIn) {
      await page.goto('https://elevenlabs.io/app/settings/api-keys', {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await page.waitForTimeout(3000);
      console.log(`URL_APIKEYS ${page.url()}`);
    }
    await page.screenshot({ path: 'eft-elevenlabs-status.png', fullPage: false });
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await context.close();
  }
})();
