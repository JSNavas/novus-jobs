import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import type { JobsRepository } from './db/jobs.repository.js';
import type { RunsRepository } from './db/runs.repository.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerRunRoutes } from './routes/runs.js';
import type { Runner } from './runner.js';
import type { Scheduler } from './scheduler/scheduler.js';

export interface AppDeps {
  jobs: JobsRepository;
  runs: RunsRepository;
  runner: Runner;
  scheduler: Scheduler;
  /** Carpeta con la UI compilada. Si no existe, el servidor solo sirve la API. */
  webDist: string | null;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.get('/api/health', () => ({ ok: true }));
  registerJobRoutes(app, { jobs: deps.jobs, runs: deps.runs });
  registerRunRoutes(app, { runs: deps.runs, runner: deps.runner, scheduler: deps.scheduler });

  if (deps.webDist) await app.register(fastifyStatic, { root: deps.webDist });
  app.setNotFoundHandler((request, reply) => {
    if (!deps.webDist || request.url.startsWith('/api/')) return reply.code(404).send({ error: 'ruta no existe' });
    return reply.sendFile('index.html');
  });
  return app;
}
