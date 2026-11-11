import { FOCUS_SEEN_KEY, type SettingsRepository } from '../db/settings.repository.js';
import type { Focus } from './focus.js';

/**
 * ═══ QUÉ ES NUEVO EN EL ENFOQUE ═══
 *
 * Un tema aparece el día que dos vacantes coinciden en pedirlo, y antes de
 * esto no había forma de enterarse: había que recordar cómo estaba la lista
 * la última vez. Justo lo contrario de para lo que existe la página.
 *
 * Nuevo = no estaba la última vez que él miró. Se guarda en la BD y no en el
 * navegador porque el contador del menú sale de la API, y porque lo que ya
 * vio no debería depender de desde qué ordenador lo vio.
 */

/** Los nombres de todo lo que la pantalla enseña ahora mismo. */
function currentNames(focus: Focus): string[] {
  return [
    ...focus.topics.map((t) => `tema:${t.name}`),
    ...focus.emerging.map((e) => `nuevo:${e.term}`),
  ];
}

function readSeen(settings: SettingsRepository): Set<string> | null {
  const raw = settings.get(FOCUS_SEEN_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : null;
  } catch {
    return null;
  }
}

/**
 * Marca lo que no estaba la última vez.
 *
 * LA PRIMERA VEZ NO SE MARCA NADA, y se guarda la lista como punto de
 * partida. Lo contrario sería abrir la pantalla y encontrarse los 39 temas
 * resaltados: eso no es un aviso, es un fondo de pantalla, y enseña a ignorar
 * el resaltado justo el día que empieza a significar algo.
 */
export function withNews(focus: Focus, settings: SettingsRepository): Focus {
  const seen = readSeen(settings);
  if (!seen) {
    settings.set(FOCUS_SEEN_KEY, JSON.stringify(currentNames(focus)));
    return { ...focus, newCount: 0 };
  }

  const topics = focus.topics.map((t) => ({ ...t, isNew: !seen.has(`tema:${t.name}`) }));
  const emerging = focus.emerging.map((e) => ({ ...e, isNew: !seen.has(`nuevo:${e.term}`) }));
  const newCount = topics.filter((t) => t.isNew).length + emerging.filter((e) => e.isNew).length;
  return { ...focus, topics, emerging, newCount };
}

/**
 * «Ya lo vi»: se llama al SALIR de la pantalla, no al entrar.
 *
 * Al entrar borraría el resaltado antes de que a él le diera tiempo a leerlo,
 * que es exactamente el aviso que no sirve para nada.
 *
 * Se añade a lo ya visto en vez de reemplazarlo: con una ventana de tres
 * meses se ven menos temas que con una de doce, y reemplazar haría que
 * cambiar la lente marcara como nuevo algo que ya se había visto.
 */
export function markSeen(focus: Focus, settings: SettingsRepository): void {
  const seen = readSeen(settings) ?? new Set<string>();
  for (const name of currentNames(focus)) seen.add(name);
  settings.set(FOCUS_SEEN_KEY, JSON.stringify([...seen]));
}
