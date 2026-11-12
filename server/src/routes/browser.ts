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

export function registerBrowserRoutes(app: FastifyInstance, deps: BrowserRoutesDeps): void {
  const profileIds = new Set(deps.sources.map((s) => s.profileId).filter((id): id is string => id !== null));

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
