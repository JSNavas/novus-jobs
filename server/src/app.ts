import fastifyMultipart from '@fastify/multipart';
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
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerIntegrationRoutes } from './routes/integrations.js';
import { registerDescriptorRoutes } from './routes/descriptors.js';
import type { SourceDescriptors } from './sources/descriptors.js';
import type { DescriptorInventor } from './sources/invent.js';
import { registerRunRoutes } from './routes/runs.js';
import type { Runner } from './runner.js';
import type { Scheduler } from './scheduler/scheduler.js';
import type { SourceSchedules } from './sources/schedules.js';
import type { SourceToggles } from './sources/toggles.js';
import type { JobSource } from './sources/types.js';
import type { CvEnhancer } from './cv/enhance.js';
import type { ProfileRepository } from './profile/profile.repository.js';

export interface AppDeps {
  jobs: JobsRepository;
  runs: RunsRepository;
  runner: Runner;
  scheduler: Scheduler;
  pool: BrowserPool;
  sources: JobSource[];
  descriptors: SourceDescriptors;
  inventor: DescriptorInventor | null;
  isNativeSource: (name: string) => boolean;
  reloadDescribed: () => void;
  scheduleHours: readonly number[];
  schedules: SourceSchedules;
  gmailAccount: string | null;
  mailConfigured: boolean;
  mailFallbackTo: string | null;
  dataDir: string;
  enhancer: CvEnhancer | null;
  profiles: ProfileRepository;
  toggles: SourceToggles;
  settings: SettingsRepository;
  profile: () => CandidateProfile;
  timeZone: () => string;
  webDist: string | null;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(fastifyMultipart, { limits: { files: 1, fileSize: 8 * 1024 * 1024 } });
  app.get('/api/health', () => ({ ok: true }));
  const focusNew = (): number => withNews(
    buildFocus(
      deps.jobs.list({
        status: null, verdict: JobVerdict.Accepted, runId: null,
        source: null, search: null, hasApply: null, limit: 500, offset: 0,
      }).items,
      deps.profile(),
    ),
    deps.settings,
  ).newCount ?? 0;

  registerJobRoutes(app, { jobs: deps.jobs, runs: deps.runs, focusNew });
  registerRunRoutes(app, {
    runs: deps.runs, runner: deps.runner, scheduler: deps.scheduler,
    hours: deps.scheduleHours, sources: deps.sources, schedules: deps.schedules, timeZone: deps.timeZone,
  });
  registerIntegrationRoutes(app, {
    sources: deps.sources, schedules: deps.schedules, runner: deps.runner,
    hours: deps.scheduleHours, toggles: deps.toggles, timeZone: deps.timeZone,
  });
  registerDescriptorRoutes(app, {
    descriptors: deps.descriptors, inventor: deps.inventor, toggles: deps.toggles,
    sources: deps.sources, isNative: deps.isNativeSource, reload: deps.reloadDescribed,
    pool: deps.pool,
  });
  registerBrowserRoutes(app, { pool: deps.pool, sources: deps.sources, scheduler: deps.scheduler });
  registerSettingsRoute(app, {
    gmailAccount: deps.gmailAccount,
    settings: deps.settings,
    language: () => deps.profile().language,
    mailConfigured: deps.mailConfigured,
    mailFallbackTo: deps.mailFallbackTo,
  });
  registerFocusRoute(app, { jobs: deps.jobs, profile: deps.profile, settings: deps.settings });
  registerOnboardingRoutes(app, { profiles: deps.profiles, dataDir: deps.dataDir, enhancer: deps.enhancer });

  if (deps.webDist) await app.register(fastifyStatic, { root: deps.webDist });
  app.setNotFoundHandler((request, reply) => {
    if (!deps.webDist || request.url.startsWith('/api/')) return reply.code(404).send({ error: 'ruta no existe' });
    return reply.sendFile('index.html');
  });
  return app;
}
