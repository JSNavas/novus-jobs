import type { FastifyInstance } from 'fastify';
import {
  FOCUS_WINDOW_MONTHS_KEY, MAX_AGE_MONTHS_KEY, MOTIVATION_TEMPLATE_KEY, type SettingsRepository,
} from '../db/settings.repository.js';
import {
  DEFAULT_FOCUS_MONTHS, DEFAULT_MAX_AGE_MONTHS, defaultMotivationTemplate, MAX_FOCUS_MONTHS,
  MAX_MAX_AGE_MONTHS, MAX_MOTIVATION_CHARS, MIN_FOCUS_MONTHS, MIN_MAX_AGE_MONTHS,
} from '../profile/motivation.js';
import type { Language } from '../profile/types.js';

/**
 * Lo que la interfaz necesita saber para montar una candidatura.
 *
 * Dos cosas: desde qué cuenta escribe él, y el párrafo de motivación que pegan
 * las postulaciones. La cuenta viene del `.env` y es de solo lectura; la
 * plantilla vive en la BD porque la cambia él desde la pantalla de
 * Configuración, y un ajuste que vive en el `.env` obliga a reiniciar el
 * servicio para corregir una frase.
 *
 * Aquí vivió también un `/api/cv` que servía su CV para descargarlo desde la
 * tarjeta. Se quitó porque no servía para nada: el CV ya está en su disco, y
 * bajarlo del dashboard solo dejaba una copia más en Descargas cuando el
 * selector de ficheros de Gmail puede cogerlo de donde está.
 */
export interface SettingsRoutesDeps {
  gmailAccount: string | null;
  settings: SettingsRepository;
  /** El idioma del perfil: decide en cuál viene la plantilla de fábrica. */
  language: () => Language;
}

/** El mínimo que exige el formulario de Get on Board. */
const MIN_MOTIVATION_CHARS = 50;

export function registerSettingsRoute(app: FastifyInstance, deps: SettingsRoutesDeps): void {
  const fallbackTemplate = (): string => defaultMotivationTemplate(deps.language());
  const motivationTemplate = (): string =>
    deps.settings.get(MOTIVATION_TEMPLATE_KEY) ?? fallbackTemplate();

  app.get('/api/settings', () => ({
    gmailAccount: deps.gmailAccount,
    motivationTemplate: motivationTemplate(),
    defaultMotivationTemplate: fallbackTemplate(),
    maxAgeMonths: readMaxAgeMonths(deps.settings),
    focusWindowMonths: readFocusWindowMonths(deps.settings),
  }));

  /**
   * Guarda la plantilla.
   *
   * Se valida el largo AQUÍ y no solo en la pantalla: los límites son los del
   * formulario al que se pega, y descubrirlos cuando Get on Board rechaza el
   * texto —con la postulación a medias— es el peor momento posible. Un texto
   * vacío no es un error: significa «vuelve a la de por defecto».
   */
  app.put('/api/settings', (request, reply) => {
    const body = request.body as {
      motivationTemplate?: unknown; maxAgeMonths?: unknown; focusWindowMonths?: unknown;
    } | undefined;

    // La ventana del Enfoque, igual que la antigüedad: se puede mandar sola.
    if (body?.focusWindowMonths !== undefined) {
      const months = Number(body.focusWindowMonths);
      if (!Number.isInteger(months) || months < MIN_FOCUS_MONTHS || months > MAX_FOCUS_MONTHS) {
        return reply.code(400).send({
          error: `la ventana del Enfoque tiene que ser un número entero entre ${MIN_FOCUS_MONTHS} y ${MAX_FOCUS_MONTHS} meses`,
        });
      }
      deps.settings.set(FOCUS_WINDOW_MONTHS_KEY, String(months));
      if (body.motivationTemplate === undefined && body.maxAgeMonths === undefined) {
        return {
          focusWindowMonths: months,
          maxAgeMonths: readMaxAgeMonths(deps.settings),
          motivationTemplate: motivationTemplate(),
        };
      }
    }

    // La antigüedad va por separado: se puede cambiar una cosa sin mandar la
    // otra, que es como la pantalla las edita.
    if (body?.maxAgeMonths !== undefined) {
      const months = Number(body.maxAgeMonths);
      if (!Number.isInteger(months) || months < MIN_MAX_AGE_MONTHS || months > MAX_MAX_AGE_MONTHS) {
        return reply.code(400).send({
          error: `la antigüedad tiene que ser un número entero entre ${MIN_MAX_AGE_MONTHS} y ${MAX_MAX_AGE_MONTHS} meses`,
        });
      }
      deps.settings.set(MAX_AGE_MONTHS_KEY, String(months));
      if (body.motivationTemplate === undefined) {
        return {
          maxAgeMonths: months,
          motivationTemplate: motivationTemplate(),
          focusWindowMonths: readFocusWindowMonths(deps.settings),
        };
      }
    }

    const value = body?.motivationTemplate;
    if (typeof value !== 'string') {
      return reply.code(400).send({ error: 'falta motivationTemplate, y tiene que ser texto' });
    }

    const template = value.trim();
    if (!template) {
      deps.settings.set(MOTIVATION_TEMPLATE_KEY, fallbackTemplate());
      return {
        motivationTemplate: fallbackTemplate(),
        maxAgeMonths: readMaxAgeMonths(deps.settings),
        focusWindowMonths: readFocusWindowMonths(deps.settings),
      };
    }
    if (template.length < MIN_MOTIVATION_CHARS) {
      return reply.code(400).send({
        error: `el texto tiene ${template.length} caracteres y el formulario pide al menos ${MIN_MOTIVATION_CHARS}`,
      });
    }
    if (template.length > MAX_MOTIVATION_CHARS) {
      return reply.code(400).send({
        error: `el texto tiene ${template.length} caracteres y el formulario admite ${MAX_MOTIVATION_CHARS} como mucho`,
      });
    }
    deps.settings.set(MOTIVATION_TEMPLATE_KEY, template);
    return {
      motivationTemplate: template,
      maxAgeMonths: readMaxAgeMonths(deps.settings),
      focusWindowMonths: readFocusWindowMonths(deps.settings),
    };
  });
}

/**
 * El tope guardado, o el de fábrica.
 *
 * Lo usa también el runner en cada pasada: así, cambiarlo en la pantalla surte
 * efecto en la siguiente búsqueda sin reiniciar el servicio.
 */
export function readMaxAgeMonths(settings: SettingsRepository): number {
  const stored = Number(settings.get(MAX_AGE_MONTHS_KEY));
  return Number.isInteger(stored) && stored >= MIN_MAX_AGE_MONTHS && stored <= MAX_MAX_AGE_MONTHS
    ? stored
    : DEFAULT_MAX_AGE_MONTHS;
}

/** La ventana guardada del Enfoque, o la de fábrica. */
export function readFocusWindowMonths(settings: SettingsRepository): number {
  const stored = Number(settings.get(FOCUS_WINDOW_MONTHS_KEY));
  return Number.isInteger(stored) && stored >= MIN_FOCUS_MONTHS && stored <= MAX_FOCUS_MONTHS
    ? stored
    : DEFAULT_FOCUS_MONTHS;
}
