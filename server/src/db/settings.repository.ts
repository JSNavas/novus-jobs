import type { Db } from './database.js';

/**
 * Los ajustes que el usuario cambia desde el dashboard.
 *
 * Clave y valor, no una columna por ajuste: el siguiente ajuste no debería
 * pedir una migración. Y en la BD y no en el `.env` porque el `.env` solo se
 * lee al arrancar — cambiar ahí la plantilla obligaría a reiniciar el
 * servicio, que es justo lo que no puede pedírsele a quien solo quiere
 * corregir una frase.
 */
export class SettingsRepository {
  constructor(private readonly db: Db) {}

  get(key: string): string | null {
    const row = this.db.prepare<[string], { value: string }>(
      'SELECT value FROM settings WHERE key = ?',
    ).get(key);
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    ).run(key, value);
  }
}

export const MOTIVATION_TEMPLATE_KEY = 'motivationTemplate';

/**
 * La antigüedad máxima de una vacante PARA ENTRAR, en meses.
 *
 * Es el filtro de la búsqueda, no el de la pantalla de Enfoque: lo que esto
 * decide es qué se guarda, y por eso vive en Configuración. La ventana con la
 * que se analiza lo ya guardado se elige en la propia página de Enfoque.
 */
export const MAX_AGE_MONTHS_KEY = 'vacancyMaxAgeMonths';

/**
 * Lo que él ya vio en el Enfoque: un array JSON de nombres. Sirve para
 * resaltar lo que apareció desde la última vez. Ver `analysis/news.ts`.
 */
export const FOCUS_SEEN_KEY = 'focusSeen';
