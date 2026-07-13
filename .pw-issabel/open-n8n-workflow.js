const { chromium } = require("playwright");

const WORKFLOW = process.env.N8N_WORKFLOW || "EP3 Slack + IA OpenRouter";
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || "";
const BASE = process.env.N8N_URL || "https://3.219.120.166.nip.io";

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  const page =
    context.pages().find((p) => p.url().includes("3.219.120.166")) ||
    context.pages()[0];
  await page.bringToFront();
  if (WORKFLOW_ID) {
    await page.goto(`${BASE}/workflow/${WORKFLOW_ID}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
  } else {
    await page.getByText(WORKFLOW, { exact: false }).first().click({ timeout: 10000 });
  }
  await page.waitForTimeout(5000);
  await page.bringToFront();
  console.log(`OPENED ${WORKFLOW} ${page.url()}`);
  process.exit(0);
})();
