import { readlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ¿Hay OTRO Chromium usando este perfil AHORA MISMO?
 *
 * Un perfil de Chromium solo admite un proceso a la vez, y lo marca con
 * `SingletonLock`: un enlace simbólico a `<host>-<pid>`.
 *
 * ⚠️ QUE EL FICHERO EXISTA NO SIGNIFICA NADA. Chromium deja el lock atrás
 * cuando muere de malas maneras (SIGKILL, crash, cierre de sesión del sistema),
 * y tratar ese enlace huérfano como "ocupado" deja el proyecto en un estado del
 * que no se sale solo: todas las pasadas fallan con "el perfil está en uso" y el
 * login tampoco arranca, porque mira lo mismo. Con `KeepAlive` en launchd el
 * servidor se relanza una y otra vez dentro de ese estado roto.
 *
 * Lo que decide es si ESE pid sigue vivo, que es lo que pregunta el propio
 * Chromium. `process.kill(pid, 0)` no mata nada: solo comprueba la existencia
 * del proceso (lanza ESRCH si no está, EPERM si está pero es de otro usuario —
 * y EPERM significa que existe, así que cuenta como ocupado).
 *
 * Esta función es la razón de que el bot del que viene este patrón lleve meses
 * leyendo LinkedIn sin que
 * nadie borre ficheros a mano.
 */
export function profileLockHolder(profileDir: string): number | null {
  let target: string;
  try {
    target = readlinkSync(join(profileDir, 'SingletonLock'));
  } catch {
    return null; // sin lock, o no es un symlink legible: el perfil está libre
  }
  const pid = Number(target.split('-').pop());
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return pid;
  } catch (error) {
    // EPERM: el proceso existe pero no es nuestro. Sigue teniendo el perfil.
    return (error as NodeJS.ErrnoException).code === 'EPERM' ? pid : null;
  }
}

/** Atajo legible: `true` solo si un proceso vivo tiene cogido el perfil. */
export function isProfileBusy(profileDir: string): boolean {
  return profileLockHolder(profileDir) !== null;
}
