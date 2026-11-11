import type { FastifyInstance } from 'fastify';
import type { RunsRepository } from '../db/runs.repository.js';
import type { Runner } from '../runner.js';
import { RunRefusedError } from '../runner.js';
import type { Scheduler } from '../scheduler/scheduler.js';
import { nextRunAt, SCHEDULE_TIMEZONE } from '../scheduler/timing.js';
import type { JobSource } from '../sources/types.js';
import { optionalInteger, stringParams, type Result } from './parse.js';

/** Diez por página en todas partes: es lo que se lee sin desplazarse. */
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

interface RunRoutesDeps {
  runs: RunsRepository;
  runner: Runner;
  scheduler: Scheduler;
  hours: readonly number[];
  sources: readonly JobSource[];
}

function parseRunsPage(raw: unknown): Result<{ limit: number; offset: number }> {
  const params = stringParams(raw);
  const limit = optionalInteger(params.limit, DEFAULT_LIMIT, 1, MAX_LIMIT, 'limit');
  if ('error' in limit) return limit;
  const offset = optionalInteger(params.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset');
  if ('error' in offset) return offset;
  return { value: { limit: limit.value, offset: offset.value } };
}

export function registerRunRoutes(app: FastifyInstance, deps: RunRoutesDeps): void {
  /**
   * Cuándo busca, para que la interfaz no tenga que suponerlo.
   *
   * `nextAt` es la próxima lectura DE VERDAD: la más cercana entre todas las
   * fuentes, franjas e intervalos mezclados. La UI no sabe —ni tiene por qué—
   * que Get on Board va cada media hora y LinkedIn por franjas.
   */
  app.get('/api/schedule', () => {
    const next = nextRunAt(
      new Date(),
      deps.hours,
      deps.sources.map((source) => ({ name: source.name, schedule: source.policy.schedule })),
      (source) => deps.runner.lastPassAt(source),
    );
    return {
      hours: deps.hours,
      timezone: SCHEDULE_TIMEZONE,
      nextAt: next === null ? null : new Date(next).toISOString(),
    };
  });

  app.get('/api/runs', (request, reply) => {
    const page = parseRunsPage(request.query);
    if ('error' in page) return reply.code(400).send({ error: page.error });
    return reply.send(deps.runs.list(page.value.limit, page.value.offset));
  });

  /** Una pasada suelta: el dashboard la abre para enseñar lo que encontró. */
  app.get<{ Params: { id: string } }>('/api/runs/:id', (request, reply) => {
    const run = deps.runs.find(Number(request.params.id));
    if (!run) return reply.code(404).send({ error: 'pasada no encontrada' });
    return reply.send(run);
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
