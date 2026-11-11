import type { SettingsRepository } from '../db/settings.repository.js';
import type { JobSource } from './types.js';

/**
 * QUÉ PLATAFORMAS ESTÁN ENCENDIDAS, GUARDADO Y EDITABLE.
 *
 * Antes lo decidía `JOB_SOURCES` en el `.env`, que solo se lee al arrancar: para
 * apagar LinkedIn un rato había que editar un fichero y reiniciar el servicio.
 * Y lo que es peor, una fuente fuera de `JOB_SOURCES` no se construía siquiera,
 * así que no existía para la interfaz: no se podía volver a encender desde el
 * dashboard porque no había nada que encender.
 *
 * Ahora se construyen TODAS las conocidas y esto dice cuáles corren. Apagar una
 * es un interruptor y surte efecto en el tick siguiente; ninguna otra parte del
 * programa se entera, porque el runner y el planificador ya preguntan aquí.
 *
 * `JOB_SOURCES` se sigue respetando como valor de PARTIDA la primera vez, para
 * que quien ya tenía el proyecto montado no vea aparecer una plataforma que
 * había quitado a propósito.
 */
export const enabledKey = (source: string): string => `source:${source}:enabled`;

export class SourceToggles {
  constructor(
    private readonly settings: Pick<SettingsRepository, 'get' | 'set'>,
    /** Lo que decía `JOB_SOURCES`: solo se usa si la fuente no tiene valor guardado. */
    private readonly seed: readonly string[],
  ) {}

  isEnabled(name: string): boolean {
    const stored = this.settings.get(enabledKey(name));
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return this.seed.includes(name);
  }

  set(name: string, enabled: boolean): void {
    this.settings.set(enabledKey(name), enabled ? 'true' : 'false');
  }

  /** Las que corren ahora mismo. Se consulta en cada tick: nunca se cachea. */
  enabled<T extends JobSource>(sources: readonly T[]): T[] {
    return sources.filter((s) => this.isEnabled(s.name));
  }
}
