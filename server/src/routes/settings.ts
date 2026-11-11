import type { FastifyInstance } from 'fastify';
import { MOTIVATION_TEMPLATE_KEY, type SettingsRepository } from '../db/settings.repository.js';
import { DEFAULT_MOTIVATION_TEMPLATE, MAX_MOTIVATION_CHARS } from '../profile/motivation.js';

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
}

/** El mínimo que exige el formulario de Get on Board. */
const MIN_MOTIVATION_CHARS = 50;

export function registerSettingsRoute(app: FastifyInstance, deps: SettingsRoutesDeps): void {
  const motivationTemplate = (): string =>
    deps.settings.get(MOTIVATION_TEMPLATE_KEY) ?? DEFAULT_MOTIVATION_TEMPLATE;

  app.get('/api/settings', () => ({
    gmailAccount: deps.gmailAccount,
    motivationTemplate: motivationTemplate(),
    defaultMotivationTemplate: DEFAULT_MOTIVATION_TEMPLATE,
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
    const body = request.body as { motivationTemplate?: unknown } | undefined;
    const value = body?.motivationTemplate;
    if (typeof value !== 'string') {
      return reply.code(400).send({ error: 'falta motivationTemplate, y tiene que ser texto' });
    }

    const template = value.trim();
    if (!template) {
      deps.settings.set(MOTIVATION_TEMPLATE_KEY, DEFAULT_MOTIVATION_TEMPLATE);
      return { motivationTemplate: DEFAULT_MOTIVATION_TEMPLATE };
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
    return { motivationTemplate: template };
  });
}
