// eft-slack-invite-bot.js - Invita al bot eft-cuy5132-citas al canal
// general-duocuc usando el comando /invite en la UI.
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, 'chrome-ep3-profile'),
    { headless: true },
  );
  const page = await context.newPage();
  try {
    await page.goto('https://app.slack.com/client/T0BDPHMPS5U/C0BEKUHAVQQ', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'eft-slack-invite-1.png', fullPage: false });

    const msgBox = page.locator('div[data-qa="message_input"] div[contenteditable="true"]').first();
    await msgBox.click();
    await msgBox.type('/invite @eft-cuy5132-citas', { delay: 30 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'eft-slack-invite-2.png', fullPage: false });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'eft-slack-invite-3.png', fullPage: false });

    const bodyText = await page.locator('body').innerText();
    console.log('BODY_TAIL', bodyText.slice(-600));
  } catch (err) {
    console.error('ERROR', err.message);
    await page.screenshot({ path: 'eft-slack-invite-ERROR.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
})();
