import { loadConfig, legacyLinkedinProfileDir, type Config } from '../config.js';
import { migrateProfile } from '../browser/migrate.js';
import { BrowserPool } from '../browser/session.js';
import { profileLockHolder } from '../browser/profile-lock.js';
import { LINKEDIN_PROFILE_ID } from '../sources/linkedin.source.js';
import { buildSource, knownSourceNames, sourceDefinition } from '../sources/registry.js';

const RELEASE_WAIT_MS = 20_000;
const POLL_MS = 500;

async function askServerToRelease(config: Config, profileId: string): Promise<boolean> {
  const url = `http://${config.host}:${config.port}/api/browser/${profileId}/release`;
  try {
    const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn(`el servidor contestó ${res.status} al pedirle el perfil`);
      return false;
    }
    console.log('el servidor soltó el perfil y pausó las pasadas mientras inicias sesión.');
    return true;
  } catch {
    return false;
  }
}

async function tellServerDone(config: Config, profileId: string): Promise<void> {
  const url = `http://${config.host}:${config.port}/api/browser/${profileId}/resume`;
  await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
}

async function waitForFreeProfile(dir: string): Promise<void> {
  const deadline = Date.now() + RELEASE_WAIT_MS;
  while (Date.now() < deadline) {
    if (profileLockHolder(dir) === null) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

function pickSourceName(argv: string[]): string {
  const asked = argv[2]?.trim();
  if (asked) return asked;
  const names = knownSourceNames();
  if (names.length === 1) return names[0]!;
  throw new Error(`di en qué plataforma: npm run login -- <${names.join('|')}>`);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const name = pickSourceName(process.argv);
  const definition = sourceDefinition(name);
  const pool = new BrowserPool(config.browserProfilesRoot, config.browserHeadless);
  const source = buildSource(name, config, pool);

  if (!source.profileId || !source.loginUrl) {
    console.log(`${definition.label} no necesita iniciar sesión.`);
    return;
  }
  if (source.profileId === LINKEDIN_PROFILE_ID) {
    migrateProfile(legacyLinkedinProfileDir(config), pool.session(LINKEDIN_PROFILE_ID).dir);
  }

  const session = pool.session(source.profileId);
  const holder = profileLockHolder(session.dir);
  if (holder !== null) {
    console.log(`el perfil lo tiene abierto el proceso ${holder}; se lo pido al servidor...`);
    const released = await askServerToRelease(config, source.profileId);
    await waitForFreeProfile(session.dir);
    const stillHeld = profileLockHolder(session.dir);
    if (stillHeld !== null) {
      throw new Error(
        `el perfil sigue abierto por el proceso ${stillHeld}${released ? '' : ' y el servidor no respondió'}. ` +
        'Cierra esa ventana de Chromium (o para el servicio con `npm run service:restart`) y repite.',
      );
    }
  }

  console.log(`\nAbriendo ${definition.label}. Inicia sesión con calma: resuelve la verificación si la pide.`);
  console.log('CIERRA LA VENTANA cuando estés dentro — ese cierre es lo que guarda la sesión.\n');
  try {
    await session.openWindow(source.loginUrl);
    console.log(`\n✅ Sesión de ${definition.label} guardada en ${session.dir}`);
    console.log('   No hace falta repetir esto salvo que la plataforma te eche.\n');
  } finally {
    await tellServerDone(config, source.profileId);
  }
}

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
