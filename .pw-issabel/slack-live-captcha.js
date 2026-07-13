const { chromium } = require('playwright');
const fs = require('fs');

const EMAIL = 'mat.oyanedel@duocuc.cl';
const ROOT = '/home/coleto/pw-ep3';
const COMMAND_PATH = `${ROOT}/slack-command.json`;
const STATUS_PATH = `${ROOT}/slack-status.json`;
const SCREENSHOT_PATH = `${ROOT}/slack-live.png`;

function readCommand() {
  if (!fs.existsSync(COMMAND_PATH)) return null;
  try {
    const command = JSON.parse(fs.readFileSync(COMMAND_PATH, 'utf8'));
    fs.unlinkSync(COMMAND_PATH);
    return command;
  } catch {
    return null;
  }
}

async function writeStatus(page, status, extra = {}) {
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  const body = (await page.locator('body').innerText()).slice(0, 3000);
  fs.writeFileSync(STATUS_PATH, JSON.stringify({
    status,
    url: page.url(),
    body,
    ...extra,
  }, null, 2));
  await page.context().storageState({ path: `${ROOT}/slack-live-state.json` });
}

async function captchaChecked(page) {
  const anchorFrame = page.frames().find(frame => /recaptcha\/api2\/anchor/.test(frame.url()));
  if (!anchorFrame) return false;
  return await anchorFrame.locator('#recaptcha-anchor').getAttribute('aria-checked') === 'true';
}

async function clickContinue(page) {
  const button = page.getByRole('button', { name: /continue|continuar/i });
  if (await button.count()) {
    await button.click();
    await page.waitForTimeout(6000);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://slack.com/get-started#/createnew', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.waitForTimeout(3000);

  let anchorFrame = page.frames().find(frame => /recaptcha\/api2\/anchor/.test(frame.url()));
  if (!anchorFrame) {
    await clickContinue(page);
    await page.waitForTimeout(5000);
    anchorFrame = page.frames().find(frame => /recaptcha\/api2\/anchor/.test(frame.url()));
  }
  if (!anchorFrame) {
    await writeStatus(page, 'captcha-anchor-missing');
  } else {
    await anchorFrame.locator('#recaptcha-anchor').click();
    await page.waitForTimeout(7000);

    if (await captchaChecked(page)) {
      await clickContinue(page);
      await writeStatus(page, 'captcha-passed');
    } else {
      const challengeFrame = page.frames().find(frame => /recaptcha\/api2\/bframe/.test(frame.url()));
      const prompt = challengeFrame
        ? (await challengeFrame.locator('body').innerText()).slice(0, 2000)
        : '';
      await writeStatus(page, 'challenge-visible', { prompt });
    }
  }

  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    const command = readCommand();
    if (!command) {
      await page.waitForTimeout(1000);
      continue;
    }

    if (command.stop) break;
    if (command.continue) {
      await clickContinue(page);
      await page.waitForTimeout(6000);
    }

    const challengeFrame = page.frames().find(frame => /recaptcha\/api2\/bframe/.test(frame.url()));
    if (challengeFrame && Array.isArray(command.tiles)) {
      const tiles = challengeFrame.locator('.rc-imageselect-tile');
      for (const tile of command.tiles) {
        await tiles.nth(tile - 1).click();
      }
    }

    if (challengeFrame && command.verify) {
      await challengeFrame.locator('#recaptcha-verify-button').click();
      await page.waitForTimeout(7000);
    }

    if (await captchaChecked(page)) {
      await clickContinue(page);
    }

    if (command.otp) {
      const inputs = page.locator('input');
      const digits = String(command.otp).replace(/\D/g, '');
      if (await inputs.count() >= digits.length) {
        for (let i = 0; i < digits.length; i += 1) {
          await inputs.nth(i).fill(digits[i]);
        }
      }
      await page.waitForTimeout(6000);
    }

    const prompt = challengeFrame
      ? (await challengeFrame.locator('body').innerText()).slice(0, 2000)
      : '';
    await writeStatus(page, await captchaChecked(page) ? 'captcha-passed' : 'waiting', { prompt });
  }

  await browser.close();
})();
