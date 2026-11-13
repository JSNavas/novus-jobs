import type { FastifyInstance } from 'fastify';
import { profileLockHolder } from '../browser/profile-lock.js';
import { LoginWindows, WindowAlreadyOpenError } from '../browser/login-window.js';
import type { BrowserPool } from '../browser/session.js';
import type { Scheduler } from '../scheduler/scheduler.js';
import { t } from '../i18n/index.js';
import type { Language } from '../profile/types.js';
import type { JobSource } from '../sources/types.js';

interface BrowserRoutesDeps {
  pool: BrowserPool;
  sources: readonly JobSource[];
  scheduler: Scheduler;
  logins: LoginWindows;
  language: () => Language;
}

export function registerBrowserRoutes(app: FastifyInstance, deps: BrowserRoutesDeps): void {
  const profileIds = new Set(deps.sources.map((s) => s.profileId).filter((id): id is string => id !== null));

  app.get('/api/sources', () => deps.sources.map((source) => ({
    name: source.name,
    label: source.labelKey ? t(deps.language(), source.labelKey) : source.label,
    needsLogin: source.loginUrl !== null,
    profileId: source.profileId,
  })));

  const needingLogin = (profileId: string): JobSource | undefined =>
    deps.sources.find((s) => s.profileId === profileId && s.loginUrl !== null);

  app.get<{ Params: { profileId: string } }>('/api/browser/:profileId/login', (request, reply) => {
    const { profileId } = request.params;
    if (!profileIds.has(profileId)) return reply.code(404).send({ error: `perfil "${profileId}" no está activo` });
    return reply.send(deps.logins.state(profileId));
  });

  app.post<{ Params: { profileId: string } }>('/api/browser/:profileId/login', async (request, reply) => {
    const { profileId } = request.params;
    const source = needingLogin(profileId);
    if (!source?.loginUrl) {
      return reply.code(404).send({ error: `perfil "${profileId}" no necesita iniciar sesión` });
    }
    try {
      return reply.code(202).send(await deps.logins.open(profileId, source.loginUrl));
    } catch (error) {
      if (error instanceof WindowAlreadyOpenError) return reply.code(409).send({ error: error.message });
      const detail = error instanceof Error ? error.message : String(error);
      return reply.code(500).send({ error: detail });
    }
  });

  app.delete<{ Params: { profileId: string } }>('/api/browser/:profileId/login', async (request, reply) => {
    const { profileId } = request.params;
    if (!profileIds.has(profileId)) return reply.code(404).send({ error: `perfil "${profileId}" no está activo` });
    const state = await deps.logins.cancel(profileId);
    deps.scheduler.resume();
    return reply.send(state);
  });

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
