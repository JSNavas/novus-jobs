import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { BrowserPool } from '../browser/session.js';
import { openDatabase, type Db } from '../db/database.js';
import { JobsRepository, type NewJob } from '../db/jobs.repository.js';
import { RunsRepository } from '../db/runs.repository.js';
import { SettingsRepository } from '../db/settings.repository.js';
import { Mailer } from '../notify/mailer.js';
import { WATCHED_ACCOUNT_POLICY } from '../sources/policy.js';
import type { JobSource } from '../sources/types.js';
import { PROFILE } from '../profile/profile.js';
import { Runner } from '../runner.js';
import { LastPassStore, Scheduler } from '../scheduler/scheduler.js';
import { SourceSchedules } from '../sources/schedules.js';
import { SourceToggles } from '../sources/toggles.js';
import { ProfileRepository } from '../profile/profile.repository.js';
import { JobLocation, JobSeniority, JobVerdict, JudgeStatus } from '../types.js';

function newJob(overrides: Partial<NewJob>): NewJob {
  return {
    source: 'linkedin',
    fingerprint: 'fp-accepted',
    title: null,
    role: null,
    company: null,
    author: 'Ana Pérez',
    text: 'Buscamos desarrollador TypeScript remoto desde Venezuela',
    url: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
    location: 'Venezuela',
    locationKind: JobLocation.HomeCountry,
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

const FAKE_SOURCE: JobSource = {
  name: 'linkedin',
  label: 'LinkedIn',
  profileId: null,
  loginUrl: null,
  policy: WATCHED_ACCOUNT_POLICY,
  async fetch() { return []; },
  async close() {},
};

describe('API HTTP', () => {
  let dir: string;
  let db: Db;
  let app: FastifyInstance;

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'jobs-api-test-'));
    db = openDatabase(dir);
    const jobs = new JobsRepository(db);
    const runs = new RunsRepository(db);
    jobs.insert(newJob({ runId: 1 }));
    jobs.insert(newJob({
      fingerprint: 'fp-rejected', verdict: JobVerdict.Rejected, rejectionReason: 'presencial',
      contactEmail: null, runId: 1,
    }));
    jobs.insert(newJob({ fingerprint: 'fp-otra-pasada', runId: 2 }));
    const settings = new SettingsRepository(db);
    const schedules = new SourceSchedules(settings, [9, 13, 18]);
    const toggles = new SourceToggles(settings, [FAKE_SOURCE.name]);
    const runner = new Runner({ sources: [FAKE_SOURCE], maxAgeDays: () => 90, jobs, runs, judge: null, profile: () => PROFILE, onboarded: () => true, enabled: () => true, timeZone: () => 'America/Caracas', mailer: new Mailer(null), dashboardUrl: 'http://localhost/' });
    const scheduler = new Scheduler({
      hours: [9, 13, 18],
      sources: [],
      store: new LastPassStore(join(dir, 'last-pass.json')),
      runner,
      enabled: () => true, timeZone: () => 'America/Caracas',
      schedules,
    });
    const pool = new BrowserPool(join(dir, 'profiles'), true);
    app = await buildApp({
      jobs, runs, runner, scheduler, pool, sources: [], scheduleHours: [9, 13, 18], schedules,
      gmailAccount: null, settings, profile: () => PROFILE, toggles, webDist: null, timeZone: () => 'America/Caracas',
      dataDir: dir, enhancer: null, profiles: new ProfileRepository(settings),
    });
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
    assert.equal(body.total, 2);
    assert.ok(body.items.every((item) => item.verdict === 'accepted'));
  });

  it('GET /api/jobs?verdict=todas trae también lo que descartó el filtro', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs?verdict=todas' });
    assert.equal(res.statusCode, 200);
    const body = res.json<{ items: Array<{ verdict: string }>; total: number }>();
    assert.equal(body.total, 3);
    assert.ok(body.items.some((item) => item.verdict === 'rejected'));
  });

  it('GET /api/jobs?runId acota a lo que encontró esa pasada', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs?runId=2&verdict=todas' });
    assert.equal(res.statusCode, 200);
    const body = res.json<{ items: Array<{ fingerprint: string }>; total: number }>();
    assert.equal(body.total, 1);
    assert.equal(body.items[0]?.fingerprint, 'fp-otra-pasada');
  });

  it('GET /api/runs devuelve una página con su total, no la lista entera', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/runs?limit=10&offset=0' });
    assert.equal(res.statusCode, 200);
    const body = res.json<{ items: unknown[]; total: number }>();
    assert.ok(Array.isArray(body.items), 'la página viene en items');
    assert.equal(typeof body.total, 'number', 'y el total, para que el paginador no mienta');
  });

  it('GET /api/jobs pagina de diez en diez por defecto', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs?verdict=todas' });
    assert.equal(res.statusCode, 200);
    const body = res.json<{ items: unknown[]; total: number }>();
    assert.ok(body.items.length <= 10, 'nunca más de diez por página');
  });

  it('GET /api/runs/:id devuelve la pasada o 404', async () => {
    const missing = await app.inject({ method: 'GET', url: '/api/runs/999' });
    assert.equal(missing.statusCode, 404);
  });

  it('GET /api/jobs sin resultados es 200 con lista vacía', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs?source=otra-fuente' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { items: [], total: 0, bySeniority: { regular: 0, junior: 0 } });
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
    assert.deepEqual(res.json(), {
      new: 1, saved: 1, total: 2, rejected: 1, lastRun: null,
      byStatus: { new: 1, seen: 0, saved: 1, dismissed: 0 },
      focusNew: 0,
    });
  });

  it('GET /api/jobs dice cuántas hay en CADA pestaña, no solo en la abierta', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs?seniority=junior' });
    assert.equal(res.statusCode, 200);
    const body = res.json<{ items: unknown[]; total: number; bySeniority: Record<string, number> }>();
    assert.equal(body.items.length, 0, 'no hay ninguna junior');
    assert.deepEqual(body.bySeniority, { regular: 2, junior: 0 }, 'pero sí las de la otra pestaña');
  });

  it('GET /api/settings trae la plantilla de fábrica cuando nunca se guardó ninguna', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/settings' });
    const body = response.json() as { motivationTemplate: string; defaultMotivationTemplate: string };

    assert.equal(response.statusCode, 200);
    assert.match(body.motivationTemplate, /\{puesto\}/);
    assert.match(body.motivationTemplate, /\{empresa\}/);
    assert.match(body.motivationTemplate, /\{tecnologias\}/);
    assert.equal(body.motivationTemplate, body.defaultMotivationTemplate);
  });

  it('PUT /api/settings guarda la plantilla y el GET siguiente la devuelve', async () => {
    const mia = `Me interesa {puesto} en {empresa}. ${'Texto de prueba suficientemente largo. '.repeat(2)}`;
    const put = await app.inject({ method: 'PUT', url: '/api/settings', payload: { motivationTemplate: mia } });
    assert.equal(put.statusCode, 200);

    const response = await app.inject({ method: 'GET', url: '/api/settings' });
    assert.equal((response.json() as { motivationTemplate: string }).motivationTemplate, mia.trim());
  });

  it('un texto vacío NO borra la plantilla: restituye la de fábrica', async () => {
    const put = await app.inject({ method: 'PUT', url: '/api/settings', payload: { motivationTemplate: '   ' } });
    const body = put.json() as { motivationTemplate: string };

    assert.equal(put.statusCode, 200);
    assert.match(body.motivationTemplate, /\{puesto\}/, 'quedarse sin texto que pegar sería peor que no dejar borrar');
  });

  it('un texto más corto que el mínimo del formulario se rechaza con el número', async () => {
    const put = await app.inject({ method: 'PUT', url: '/api/settings', payload: { motivationTemplate: 'muy corto' } });

    assert.equal(put.statusCode, 400);
    assert.match((put.json() as { error: string }).error, /al menos 50/);
  });

  it('un texto más largo que el máximo se rechaza aquí y no en Get on Board', async () => {
    const put = await app.inject({ method: 'PUT', url: '/api/settings', payload: { motivationTemplate: 'x'.repeat(1001) } });

    assert.equal(put.statusCode, 400);
    assert.match((put.json() as { error: string }).error, /1000 como mucho/);
  });

  it('GET /api/schedule dice las horas y la zona, para que la UI no las invente', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/schedule' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { hours: [9, 13, 18], timezone: 'America/Caracas', nextAt: null });
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
    assert.match(second.json<{ error: string }>().error, /espera \d+ min|en curso/);
  });
});
