import { existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { isProfileBusy } from './profile-lock.js';

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
