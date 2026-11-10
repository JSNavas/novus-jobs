import { existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { isProfileBusy } from './profile-lock.js';

/**
 * Mueve un perfil de navegador de su sitio viejo al nuevo, UNA vez.
 *
 * Existe para no cobrarle al señor un login que ya hizo: el perfil de LinkedIn
 * vivía dentro de `server/data/` y ahora vive fuera del repo. Sin esto, el
 * primer arranque tras el cambio encontraría una carpeta vacía y pediría
 * iniciar sesión otra vez — y el objetivo entero de este trabajo es que iniciar
 * sesión sea algo que pase una sola vez.
 *
 * Se mueve con `rename`, que es atómico dentro del mismo disco: o está entero
 * en el destino o sigue entero en el origen. Y no se toca nada si el perfil lo
 * tiene abierto un Chromium vivo, porque mover el directorio bajo los pies de
 * un navegador en marcha corrompe la cookie jar.
 */
export function migrateProfile(from: string, to: string): boolean {
  if (!existsSync(from)) return false;
  if (existsSync(to) && readdirSync(to).length > 0) return false;
  if (isProfileBusy(from)) {
    console.warn(`[perfil] ${from} está abierto en otro navegador: no se mueve ahora, se intentará en el siguiente arranque`);
    return false;
  }
  try {
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
    console.log(`[perfil] sesión movida de ${from} a ${to} (fuera del repo: ya no se pierde al recompilar o limpiar)`);
    return true;
  } catch (error) {
    console.warn(
      `[perfil] no se pudo mover ${from} a ${to}: ${error instanceof Error ? error.message : String(error)}. ` +
      'Si la sesión no funciona, muévelo a mano o vuelve a iniciar sesión.',
    );
    return false;
  }
}
