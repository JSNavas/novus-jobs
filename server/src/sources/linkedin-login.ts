import { chromium } from 'playwright';
import { loadConfig } from '../config.js';
import { isProfileLocked } from './linkedin.source.js';

const LOGIN_TIMEOUT_MS = 10 * 60_000;

async function main(): Promise<void> {
  const config = loadConfig();
  if (isProfileLocked(config.linkedinProfileDir)) {
    throw new Error(`el perfil ${config.linkedinProfileDir} está en uso: cierra el servidor o la ventana de LinkedIn antes de iniciar sesión`);
  }
  const context = await chromium.launchPersistentContext(config.linkedinProfileDir, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    locale: 'es-ES',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto('https://www.linkedin.com/login');
    console.log('Inicia sesión en LinkedIn en la ventana abierta. Se cierra sola al llegar al feed (máximo 10 min).');
    await page.waitForURL(/linkedin\.com\/feed/, { timeout: LOGIN_TIMEOUT_MS });
    // Let LinkedIn finish setting its session cookies before the profile is flushed to disk.
    await page.waitForTimeout(5_000);
    console.log(`Sesión guardada en ${config.linkedinProfileDir}`);
  } finally {
    await context.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
