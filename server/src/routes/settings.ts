import type { FastifyInstance } from 'fastify';

/**
 * Lo que la interfaz necesita saber para montar una candidatura.
 *
 * De momento una sola cosa: desde qué cuenta escribe él. No se mezcla con los
 * avisos de Resend a propósito — ese correo va del servidor HACIA él, y este
 * es el que él manda a quien contrata.
 *
 * Aquí vivió también un `/api/cv` que servía su CV para descargarlo desde la
 * tarjeta. Se quitó porque no servía para nada: el CV ya está en su disco, y
 * bajarlo del dashboard solo dejaba una copia más en Descargas cuando el
 * selector de ficheros de Gmail puede cogerlo de donde está.
 */
export function registerSettingsRoute(app: FastifyInstance, gmailAccount: string | null): void {
  app.get('/api/settings', () => ({ gmailAccount }));
}
