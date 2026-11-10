import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { openDatabase, type Db } from '../db/database.js';
import { JobsRepository, type NewJob } from '../db/jobs.repository.js';
import { RunsRepository } from '../db/runs.repository.js';
import { PROFILE } from '../profile/profile.js';
import { Runner } from '../runner.js';
import { LastPassStore, Scheduler } from '../scheduler/scheduler.js';
import { JobLocation, JobSeniority, JobVerdict, JudgeStatus } from '../types.js';

function newJob(overrides: Partial<NewJob>): NewJob {
  return {
    source: 'linkedin',
    fingerprint: 'fp-accepted',
    title: null,
    company: null,
    author: 'Ana Pérez',
    text: 'Buscamos desarrollador TypeScript remoto desde Venezuela',
    url: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
    location: 'Venezuela',
    locationKind: JobLocation.Venezuela,
    verdict: JobVerdict.Accepted,
    rejectionReason: null,
    seniority: JobSeniority.Regular,
    isAggregator: false,
    isUncertain: false,
    judgeStatus: JudgeStatus.Skipped,
    stackMatch: ['TypeScript'],
    applyUrl: null,
    contactEmail: 'rrhh@example.com',
    postedAt: null,
    ...overrides,
  };
}

describe('API HTTP', () => {
  let dir: string;
  let db: Db;
  let app: FastifyInstance;

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'jobs-api-test-'));
    db = openDatabase(dir);
    const jobs = new JobsRepository(db);
    const runs = new RunsRepository(db);
    jobs.insert(newJob({}));
    jobs.insert(newJob({ fingerprint: 'fp-rejected', verdict: JobVerdict.Rejected, rejectionReason: 'presencial', contactEmail: null }));
    const runner = new Runner({ sources: [], jobs, runs, judge: null, profile: PROFILE });
    const scheduler = new Scheduler({
      hours: [9, 13, 18],
      store: new LastPassStore(join(dir, 'last-pass.json')),
      runner,
    });
    app = await buildApp({ jobs, runs, runner, scheduler, webDist: null });
  });

  after(async () => {
    await app.close();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET /api/health responde ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
  });

  it('GET /api/jobs devuelve solo aceptadas por defecto', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs' });
    assert.equal(res.statusCode, 200);
    const body = res.json<{ items: Array<{ verdict: string }>; total: number }>();
    assert.equal(body.total, 1);
    assert.equal(body.items[0]?.verdict, 'accepted');
  });

  it('GET /api/jobs sin resultados es 200 con lista vacía', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs?source=otra-fuente' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { items: [], total: 0 });
  });

  it('GET /api/jobs con un filtro inválido es 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs?status=archivada' });
    assert.equal(res.statusCode, 400);
    assert.match(res.json<{ error: string }>().error, /status inválido/);
  });

  it('GET /api/jobs/:id devuelve la oferta o 404', async () => {
    const found = await app.inject({ method: 'GET', url: '/api/jobs/1' });
    assert.equal(found.statusCode, 200);
    assert.equal(found.json<{ id: number }>().id, 1);
    const missing = await app.inject({ method: 'GET', url: '/api/jobs/999' });
    assert.equal(missing.statusCode, 404);
  });

  it('PATCH /api/jobs/:id cambia el estado y valida el valor', async () => {
    const bad = await app.inject({ method: 'PATCH', url: '/api/jobs/1', payload: { status: 'borrada' } });
    assert.equal(bad.statusCode, 400);
    const ok = await app.inject({ method: 'PATCH', url: '/api/jobs/1', payload: { status: 'saved' } });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json<{ status: string }>().status, 'saved');
    const missing = await app.inject({ method: 'PATCH', url: '/api/jobs/999', payload: { status: 'seen' } });
    assert.equal(missing.statusCode, 404);
  });

  it('GET /api/stats cuenta las aceptadas y lleva la última pasada', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/stats' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { new: 0, saved: 1, total: 1, lastRun: null });
  });

  it('GET /api/runs valida el límite', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/runs?limit=0' });
    assert.equal(res.statusCode, 400);
  });

  it('una ruta /api inexistente responde con el mismo formato de error', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/no-existe' });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.json(), { error: 'ruta no existe' });
  });

  it('POST /api/runs arranca una búsqueda y la segunda dentro de la hora es 409', async () => {
    const first = await app.inject({ method: 'POST', url: '/api/runs' });
    assert.equal(first.statusCode, 202);
    assert.equal(first.json<{ trigger?: string; status: string }>().status, 'running');
    const second = await app.inject({ method: 'POST', url: '/api/runs' });
    assert.equal(second.statusCode, 409);
    assert.match(second.json<{ error: string }>().error, /manual por hora|en curso/);
  });
});
