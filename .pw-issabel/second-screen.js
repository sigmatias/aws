// second-screen.js - Helper reutilizable: lanza Chrome visible, posicionado
// y dimensionado exactamente sobre el monitor secundario (el mas chico),
// reusando el perfil persistente de EP3 (sesiones ya logueadas si siguen vigentes).
//
// Uso como modulo:
//   const { launchOnSecondScreen } = require('./second-screen');
//   const { context, page } = await launchOnSecondScreen();
//   ... acciones ...
//   await context.close();
const { chromium } = require('playwright');
const path = require('path');

const PROFILE_DIR = path.join(__dirname, 'chrome-ep3-profile');

// Monitor secundario detectado por tools/snap_eft_secondary.py --list:
// bbox=(-1366, 336, 0, 1104) -> 1366x768
const SCREEN = { x: -1366, y: 336, width: 1366, height: 768 };

async function launchOnSecondScreen(extraArgs = []) {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: null,
    args: [
      `--window-position=${SCREEN.x},${SCREEN.y}`,
      `--window-size=${SCREEN.width},${SCREEN.height}`,
      '--ignore-certificate-errors',
      ...extraArgs,
    ],
  });
  const page = context.pages()[0] || (await context.newPage());
  return { context, page };
}

module.exports = { launchOnSecondScreen, SCREEN };
