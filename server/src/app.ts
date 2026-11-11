import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import type { BrowserPool } from './browser/session.js';
import type { JobsRepository } from './db/jobs.repository.js';
import type { RunsRepository } from './db/runs.repository.js';
import type { SettingsRepository } from './db/settings.repository.js';
import type { CandidateProfile } from './filters/decide.js';
import { registerBrowserRoutes } from './routes/browser.js';
import { buildFocus } from './analysis/focus.js';
import { withNews } from './analysis/news.js';
import { JobVerdict } from './types.js';
import { registerFocusRoute } from './routes/focus.js';
import { registerSettingsRoute } from './routes/settings.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerIntegrationRoutes } from './routes/integrations.js';
import { registerRunRoutes } from './routes/runs.js';
import type { Runner } from './runner.js';
import type { Scheduler } from './scheduler/scheduler.js';
import type { SourceSchedules } from './sources/schedules.js';
import type { SourceToggles } from './sources/toggles.js';
import type { JobSource } from './sources/types.js';

export interface AppDeps {
  jobs: JobsRepository;
  runs: RunsRepository;
  runner: Runner;
  scheduler: Scheduler;
  pool: BrowserPool;
  sources: readonly JobSource[];
  scheduleHours: readonly number[];
  schedules: SourceSchedules;
  gmailAccount: string | null;
  /** Qué plataformas están encendidas. La ruta de integraciones las lee y las cambia. */
  toggles: SourceToggles;
  settings: SettingsRepository;
  /** Se lee en cada petición: el perfil cambia desde Configuración sin reiniciar. */
  profile: () => CandidateProfile;
  /** Carpeta con la UI compilada. Si no existe, el servidor solo sirve la API. */
  webDist: string | null;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.get('/api/health', () => ({ ok: true }));
  // El contador de novedades del Enfoque se calcula aquí, una vez, y lo usan
  // las dos rutas. Sale de lo mismo que la pantalla, así que el número del
  // menú y lo resaltado dentro no pueden desmentirse.
  const focusNew = (): number => withNews(
    buildFocus(
      deps.jobs.list({
        status: null, verdict: JobVerdict.Accepted, runId: null, seniority: null,
        source: null, search: null, hasApply: null, limit: 500, offset: 0,
      }).items,
      deps.profile(),
    ),
    deps.settings,
  ).newCount ?? 0;

  registerJobRoutes(app, { jobs: deps.jobs, runs: deps.runs, focusNew });
  registerRunRoutes(app, { runs: deps.runs, runner: deps.runner, scheduler: deps.scheduler, hours: deps.scheduleHours, sources: deps.sources, schedules: deps.schedules });
  registerIntegrationRoutes(app, {
    sources: deps.sources, schedules: deps.schedules, runner: deps.runner,
    hours: deps.scheduleHours, toggles: deps.toggles,
  });
  registerBrowserRoutes(app, { pool: deps.pool, sources: deps.sources, scheduler: deps.scheduler });
  registerSettingsRoute(app, { gmailAccount: deps.gmailAccount, settings: deps.settings });
  registerFocusRoute(app, { jobs: deps.jobs, profile: deps.profile, settings: deps.settings });

  if (deps.webDist) await app.register(fastifyStatic, { root: deps.webDist });
  app.setNotFoundHandler((request, reply) => {
    if (!deps.webDist || request.url.startsWith('/api/')) return reply.code(404).send({ error: 'ruta no existe' });
    return reply.sendFile('index.html');
  });
  return app;
}
