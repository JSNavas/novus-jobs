import type { FastifyInstance } from 'fastify';
import type { JobQuery, JobsRepository } from '../db/jobs.repository.js';
import type { RunsRepository } from '../db/runs.repository.js';
import { JobStatus, JobVerdict } from '../types.js';
import { isOneOf, optionalBoolean, optionalEnum, optionalInteger, stringParams, type Result } from './parse.js';

const ALL_VERDICTS = 'todas';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

interface JobRoutesDeps {
  jobs: JobsRepository;
  runs: RunsRepository;
  focusNew: () => number;
}

function parseJobQuery(raw: unknown): Result<JobQuery> {
  const params = stringParams(raw);
  const status = optionalEnum(params.status, Object.values(JobStatus), 'status');
  if ('error' in status) return status;
  const wantsAll = params.verdict === ALL_VERDICTS;
  const verdict = wantsAll
    ? ({ value: null } as Result<JobVerdict | null>)
    : optionalEnum(params.verdict, Object.values(JobVerdict), 'verdict');
  if ('error' in verdict) return verdict;
  const hasApply = optionalBoolean(params.hasApply, 'hasApply');
  if ('error' in hasApply) return hasApply;
  const limit = optionalInteger(params.limit, DEFAULT_LIMIT, 1, MAX_LIMIT, 'limit');
  if ('error' in limit) return limit;
  const offset = optionalInteger(params.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset');
  if ('error' in offset) return offset;
  const runId = optionalInteger(params.runId, 0, 0, Number.MAX_SAFE_INTEGER, 'runId');
  if ('error' in runId) return runId;
  return {
    value: {
      status: status.value,
      verdict: wantsAll ? null : verdict.value ?? JobVerdict.Accepted,
      runId: params.runId ? runId.value : null,
      source: params.source || null,
      search: params.q || null,
      hasApply: hasApply.value,
      limit: limit.value,
      offset: offset.value,
    },
  };
}

function parseStatusBody(body: unknown): Result<JobStatus> {
  const status = typeof body === 'object' && body !== null && 'status' in body ? body.status : undefined;
  const values = Object.values(JobStatus);
  if (typeof status === 'string' && isOneOf(values, status)) return { value: status };
  return { error: `status inválido. Valores admitidos: ${values.join(', ')}` };
}

export function registerJobRoutes(app: FastifyInstance, deps: JobRoutesDeps): void {
  app.get('/api/jobs', (request, reply) => {
    const query = parseJobQuery(request.query);
    if ('error' in query) return reply.code(400).send({ error: query.error });
    return reply.send(deps.jobs.list(query.value));
  });

  app.get<{ Params: { id: string } }>('/api/jobs/:id', (request, reply) => {
    const job = deps.jobs.findById(Number(request.params.id));
    if (!job) return reply.code(404).send({ error: 'oferta no encontrada' });
    return reply.send(job);
  });

  app.patch<{ Params: { id: string } }>('/api/jobs/:id', (request, reply) => {
    const body = parseStatusBody(request.body);
    if ('error' in body) return reply.code(400).send({ error: body.error });
    const job = deps.jobs.updateStatus(Number(request.params.id), body.value);
    if (!job) return reply.code(404).send({ error: 'oferta no encontrada' });
    return reply.send(job);
  });

  app.get('/api/stats', (_request, reply) => {
    return reply.send({ ...deps.jobs.stats(), lastRun: deps.runs.latest(), focusNew: deps.focusNew() });
  });
}
