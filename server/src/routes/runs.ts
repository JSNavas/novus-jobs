import type { FastifyInstance } from 'fastify';
import type { RunsRepository } from '../db/runs.repository.js';
import type { Runner } from '../runner.js';
import { RunRefusedError } from '../runner.js';
import type { Scheduler } from '../scheduler/scheduler.js';
import { optionalInteger, stringParams, type Result } from './parse.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface RunRoutesDeps {
  runs: RunsRepository;
  runner: Runner;
  scheduler: Scheduler;
}

function parseRunsLimit(raw: unknown): Result<number> {
  return optionalInteger(stringParams(raw).limit, DEFAULT_LIMIT, 1, MAX_LIMIT, 'limit');
}

export function registerRunRoutes(app: FastifyInstance, deps: RunRoutesDeps): void {
  app.get('/api/runs', (request, reply) => {
    const limit = parseRunsLimit(request.query);
    if ('error' in limit) return reply.code(400).send({ error: limit.error });
    return reply.send(deps.runs.list(limit.value));
  });

  app.post('/api/runs', (_request, reply) => {
    try {
      const run = deps.runner.startManual();
      deps.scheduler.markCurrentSlot();
      return reply.code(202).send(run);
    } catch (error) {
      if (error instanceof RunRefusedError) return reply.code(409).send({ error: error.message });
      throw error;
    }
  });
}
