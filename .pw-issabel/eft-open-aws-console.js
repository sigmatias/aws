// eft-open-aws-console.js - Abre la consola AWS (EC2 Security Groups) en la
// segunda pantalla para captura de evidencia. Usa las credenciales del
// Learner Lab ya activas via la URL de login federado con signin token,
// o si no hay sesion, deja la pantalla en el login para que el usuario
// complete manualmente (AWS Academy usa credenciales federadas, no
// usuario/clave tradicional).
const { launchOnSecondScreen } = require('./second-screen');

(async () => {
  const { context, page } = await launchOnSecondScreen();
  try {
    await page.goto('https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#SecurityGroups:', {
      waitUntil: 'domcontentloaded', timeout: 45000,
    });
    await page.waitForTimeout(4000);
    console.log('URL', page.url());
  } catch (err) {
    console.error('ERROR', err.message);
  }
})();
