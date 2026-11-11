import type { CandidateProfile } from './types.js';

/**
 * El perfil con el que arranca una instalación nueva: vacío de tecnología y sin
 * ningún filtro puesto.
 *
 * Vacío NO significa "todo entra": con `stack` vacío no hay nada que coincidir y
 * el filtro descarta cuanto llegue. Es a propósito — mientras el alta no esté
 * hecha, el planificador no lanza ninguna búsqueda (ver `runner.ts`), así que
 * nadie gasta una lectura de su cuenta para descartarlo todo. Lo que define este
 * objeto es solo con qué llega el formulario cuando el CV no trajo un campo.
 */
export const DEFAULT_PROFILE: CandidateProfile = {
  stack: [],
  core: [],
  cannotDo: [],
  english: { level: 'none', filter: false },
  geo: { country: '', city: null, excludeLocalEmployers: false },
  modality: { remoteGlobal: true, remoteHomeCountry: true, hybrid: true, onsite: true },
};

/**
 * Los días de antigüedad máxima y la ventana de Enfoque por defecto no viven
 * aquí: son ajustes de `settings` y ya tienen su propio valor por defecto. Esto
 * es solo el candidato.
 */
