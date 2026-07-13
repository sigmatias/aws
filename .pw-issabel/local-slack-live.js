const { chromium } = require('D:/caches/pw-capture/node_modules/playwright-core');
const fs = require('fs');

const EMAIL = 'mat.oyanedel@duocuc.cl';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = 'D:/caches/pw-profiles/ep3-slack-live';
const ROOT = 'D:/CLAUDE/tarea-prueba/.pw-issabel';
const COMMAND_PATH = `${ROOT}/local-slack-command.json`;
const STATUS_PATH = `${ROOT}/local-slack-status.json`;
const SCREENSHOT_PATH = `${ROOT}/local-slack-live.png`;
const CHALLENGE_PATH = `${ROOT}/local-slack-challenge.png`;

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

function anchorFrame(page) {
  return page.frames().find(frame => /recaptcha\/(api2|enterprise)\/anchor/.test(frame.url()));
}

function challengeFrame(page) {
  return page.frames().find(frame => /recaptcha\/(api2|enterprise)\/bframe/.test(frame.url()));
}

async function checked(page) {
  const frame = anchorFrame(page);
  if (!frame) return false;
  return await frame.locator('#recaptcha-anchor').getAttribute('aria-checked') === 'true';
}

async function capture(page, status) {
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  const frame = challengeFrame(page);
  let prompt = '';
  let tiles = 0;
  if (frame) {
    prompt = (await frame.locator('body').innerText()).slice(0, 2500);
    tiles = await frame.locator('.rc-imageselect-tile').count();
    try {
      const element = await frame.frameElement();
      await element.screenshot({ path: CHALLENGE_PATH });
    } catch {
      // The challenge frame may exist briefly while hidden or being replaced.
    }
  }
  fs.writeFileSync(STATUS_PATH, JSON.stringify({
    status,
    url: page.url(),
    checked: await checked(page),
    prompt,
    tiles,
    body: (await page.locator('body').innerText()).slice(0, 3000),
  }, null, 2));
}

(async () => {
  const context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME,
    headless: false,
    viewport: { width: 1366, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();

  await page.goto('https://slack.com/get-started#/createnew', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.getByRole('button', { name: /continue|continuar/i }).click();
  await page.waitForTimeout(5000);

  const anchor = anchorFrame(page);
  if (anchor) {
    await anchor.locator('#recaptcha-anchor').click();
    await page.waitForTimeout(7000);
  }
  await capture(page, 'ready');

  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const command = readCommand();
    if (!command) {
      await page.waitForTimeout(1000);
      continue;
    }
    if (command.stop) break;

    let challenge = challengeFrame(page);
    if (challenge && Array.isArray(command.tiles)) {
      for (const tile of command.tiles) {
        challenge = challengeFrame(page);
        if (!challenge) break;
        try {
          await challenge.locator('.rc-imageselect-tile').nth(tile - 1).evaluate(element => element.click());
        } catch {
          await page.waitForTimeout(1000);
          challenge = challengeFrame(page);
          if (challenge) {
            await challenge.locator('.rc-imageselect-tile').nth(tile - 1).evaluate(element => element.click());
          }
        }
      }
    }

    challenge = challengeFrame(page);
    if (challenge && command.verify) {
      try {
        await challenge.locator('#recaptcha-verify-button').evaluate(element => element.click());
      } catch {
        await page.waitForTimeout(1000);
        challenge = challengeFrame(page);
        if (challenge) {
          await challenge.locator('#recaptcha-verify-button').evaluate(element => element.click());
        }
      }
      await page.waitForTimeout(7000);
    }

    if (await checked(page)) {
      const continueButton = page.getByRole('button', { name: /continue|continuar/i });
      if (await continueButton.count()) {
        await continueButton.click();
        await page.waitForTimeout(7000);
      }
    }

    if (command.otp) {
      const digits = String(command.otp).replace(/\D/g, '');
      const inputs = page.locator('input');
      if (await inputs.count() >= digits.length) {
        for (let index = 0; index < digits.length; index += 1) {
          await inputs.nth(index).fill(digits[index]);
        }
        await page.waitForTimeout(7000);
      }
    }

    await capture(page, 'updated');
  }

  await context.close();
})();
