import type { FastifyInstance } from 'fastify';
import { profileLockHolder } from '../browser/profile-lock.js';
import type { BrowserPool } from '../browser/session.js';
import type { Scheduler } from '../scheduler/scheduler.js';
import type { JobSource } from '../sources/types.js';

interface BrowserRoutesDeps {
  pool: BrowserPool;
  sources: readonly JobSource[];
  scheduler: Scheduler;
}

/**
 * Las dos rutas que hacen posible iniciar sesión sin pelearse con el servidor.
 *
 * Un perfil de Chromium solo admite UN proceso, y el servidor se queda con el
 * navegador cinco minutos después de cada pasada. Antes eso convertía el login
 * en "para el servidor" — un servidor que launchd relanza solo — y el camino
 * real era matar procesos a mano, con lo que Chromium moría de malas maneras y
 * dejaba el perfil marcado como ocupado para siempre. Estas rutas son la vía
 * limpia: el login pide el perfil, el servidor lo suelta y pausa las pasadas, y
 * al cerrar la ventana las reanuda.
 */
export function registerBrowserRoutes(app: FastifyInstance, deps: BrowserRoutesDeps): void {
  const profileIds = new Set(deps.sources.map((s) => s.profileId).filter((id): id is string => id !== null));

  /** Qué plataformas hay activas y si su sesión está en uso. Lo que la UI necesita para crecer. */
  app.get('/api/sources', () => deps.sources.map((source) => ({
    name: source.name,
    label: source.label,
    needsLogin: source.loginUrl !== null,
    profileId: source.profileId,
  })));

  app.post<{ Params: { profileId: string } }>('/api/browser/:profileId/release', async (request, reply) => {
    const { profileId } = request.params;
    if (!profileIds.has(profileId)) return reply.code(404).send({ error: `perfil "${profileId}" no está activo` });
    const pausedUntil = deps.scheduler.pauseForLogin();
    await deps.pool.session(profileId).close();
    return reply.send({ released: true, pausedUntil: pausedUntil.toISOString() });
  });

  app.post<{ Params: { profileId: string } }>('/api/browser/:profileId/resume', (request, reply) => {
    const { profileId } = request.params;
    if (!profileIds.has(profileId)) return reply.code(404).send({ error: `perfil "${profileId}" no está activo` });
    deps.scheduler.resume();
    return reply.send({ resumed: true, lockedBy: profileLockHolder(deps.pool.session(profileId).dir) });
  });
}
