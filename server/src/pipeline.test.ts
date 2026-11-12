import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { openDatabase, type Db } from './db/database.js';
import { JobsRepository } from './db/jobs.repository.js';
import type { LlmJudge, JudgeVerdict } from './filters/judge.js';
import { runPasses } from './pipeline.js';
import { PROFILE } from './profile/profile.js';
import { OPEN_API_POLICY } from './sources/policy.js';
import type { JobSource, RawPost } from './sources/types.js';
import { JobLocation, JobStatus, JobVerdict, JudgeStatus } from './types.js';

const BUENA =
  'Buscamos Full Stack Senior 100% remoto para LATAM. Stack: Node.js, React, PostgreSQL. Sueldo USD 3000. Postula: https://lnkd.in/dxyz';

const OTRA_BUENA =
  'Otra vacante: buscamos Backend Senior 100% remoto para LATAM. Stack: Node.js, TypeScript, PostgreSQL. Sueldo USD 3500. Postula: https://lnkd.in/dotra';

const PRESENCIAL =
  'Full-Stack Developer (Senior). Ubicacion: Barcelona, Espana. Modalidad presencial. Buscamos un/a Full-Stack Developer con Node.js, React y AWS. Contrato indefinido. Postula en https://lnkd.in/dabc';

const SEGURIDAD_DE_RED =
  'Freelanly | Ingeniero de Seguridad de Red. Estados Unidos. USD 102000-138000/ano. El cliente necesita un Ingeniero de Seguridad de Red para firewalls, VPN y segmentacion. Scripting en Python deseable. Remoto. Postula: https://lnkd.in/dseg';

const REMOTO_SOLO_ESPANA =
  'TECDATA ENGINEERING busca: Desarrollador/a Front-End Vue.js - Remoto\nUbicacion: Spain\nPostular: https://himalayas.app/companies/tecdata-engineering/jobs/desarrollador-a-front-end-vue-js-remoto\n\nEn TecData Engineering buscamos un/a Desarrollador/a Front-End Vue.js para un cliente del sector eCommerce.\nUbicacion: Madrid\nModalidad: Teletrabajo\nMinimo 3 anos de experiencia en desarrollo Front-End con Vue.js. Valorable experiencia con Node.js.';

const HN_BERLIN =
  'eventfirst busca: Senior Full-Stack Engineer | Berlin, Germany | REMOTE (CET) | Full-time | eventfirst.com\nHilo: Ask HN: Who is hiring? (November 2026)\nPostular: https://news.ycombinator.com/item?id=50341824\n\neventfirst | Senior Full-Stack Engineer | Berlin, Germany | REMOTE (CET) | Full-time. Buscamos alguien con Node.js, TypeScript y React para nuestro equipo.';

const SQUARESPACE_JAVA =
  'Squarespace busca: Staff Software Engineer, Revenue Systems\nPostular: https://weworkremotely.com/x\n\nSignificant experience with multiple programming languages (especially Java) and a broad range of tools like Springboot, hibernate, databases. Demonstrated experience leading system architecture for revenue platforms. 100% remote.';

const SIN_STACK =
  'Buscamos Contador Senior 100% remoto para LATAM. Responsabilidades: conciliaciones, impuestos y cierres mensuales. Sueldo USD 2000. Postula en jobs@acme.com';

function fakeSourceAged(texts: readonly string[], days: number): JobSource {
  const postedAt = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  const base = fakeSource(texts);
  return {
    ...base,
    async fetch(): Promise<RawPost[]> {
      return texts.map((text) => ({
        text, author: 'Alguien', url: null,
        metrics: { postedAt, applications: 500, responseDays: null },
      }));
    },
  };
}

function fakeSourceWithMetrics(texts: readonly string[], applications: number): JobSource {
  const base = fakeSource(texts);
  return {
    ...base,
    async fetch(): Promise<RawPost[]> {
      return texts.map((text) => ({
        text,
        author: 'Alguien',
        url: null,
        metrics: {
          postedAt: '2026-11-02T10:00:00.000Z',
          applications,
          responseDays: { min: 23, max: 31 },
        },
      }));
    },
  };
}

function fakeSource(texts: readonly string[]): JobSource {
  return {
    name: 'linkedin',
    label: 'LinkedIn',
    profileId: null,
    loginUrl: null,
    policy: OPEN_API_POLICY,
    async fetch(): Promise<RawPost[]> {
      return texts.map((text) => ({ text, author: 'Alguien', url: null }));
    },
    async close() {},
  };
}

function fakeJudge(decide: (text: string, index: number) => Partial<JudgeVerdict>): {
  judge: LlmJudge;
  seen: string[];
} {
  const seen: string[] = [];
  const judge = {
    async judge(offers: readonly { text: string }[]): Promise<JudgeVerdict[]> {
      return offers.map((offer, index) => {
        seen.push(offer.text);
        return {
          index,
          isOffer: true,
          rejection: null,
          reason: 'motivo de prueba',
          aggregator: false,
          ...decide(offer.text, index),
        };
      });
    },
  };
  return { judge: judge as unknown as LlmJudge, seen };
}

describe('pipeline — el juez cruzado con las reglas', () => {
  let dir: string;
  let db: Db;
  let jobs: JobsRepository;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pipeline-test-'));
    db = openDatabase(dir);
    jobs = new JobsRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function run(texts: readonly string[], judge: LlmJudge | null) {
    return runPasses([fakeSource(texts)], { jobs, judge, profile: PROFILE, runId: 1, maxAgeDays: 90 });
  }

  it('EL CASO REAL: rescata una oferta que la regla de ubicación había descartado', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await run([PRESENCIAL], judge);

    assert.equal(result.outcome.accepted, 1, 'el juez dijo que sirve, así que entra');
    assert.equal(result.outcome.rejected, 0);

    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(stored.items.length, 1);
    const job = stored.items[0]!;
    assert.equal(job.verdict, JobVerdict.Accepted);
    assert.equal(job.rejectionReason, null);
    assert.equal(job.judgeStatus, JudgeStatus.Judged);
  });

  it('un rescate por ubicación no sigue afirmando la ubicación que se acaba de tumbar', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    await run([PRESENCIAL], judge);

    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    const job = stored.items[0]!;
    assert.equal(job.locationKind, JobLocation.Unknown, 'ya no es "presencial": nadie lo sabe');
    assert.equal(job.isUncertain, true, 'entra marcada como por confirmar, no como oferta limpia');
  });

  it('EL CASO REAL (himalayas, 12 nov 2026): un remoto solo para España no lo rescata el juez', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await run([REMOTO_SOLO_ESPANA], judge);

    assert.equal(result.outcome.accepted, 0, 'teletrabajo desde Madrid no es teletrabajo desde Caracas');
    assert.equal(result.outcome.rejected, 1);

    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    const job = stored.items[0]!;
    assert.equal(job.verdict, JobVerdict.Rejected);
    assert.equal(job.locationKind, JobLocation.OtherCountry, 'el país lo dice el anuncio: no hay nada que revocar');
  });

  it('EL CASO REAL (hackernews, 12 nov 2026): rescatar "no es oferta" no salta el filtro de ubicación', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await run([HN_BERLIN], judge);

    assert.equal(result.outcome.accepted, 0, 'que sí sea una oferta no la vuelve trabajable desde Caracas');
    assert.equal(result.outcome.rejected, 1);

    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(stored.items[0]!.verdict, JobVerdict.Rejected);
  });

  it('lo descartado por el stack NO lo rescata el juez, ni aunque diga que sirve', async () => {
    const { judge, seen } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await run([SIN_STACK], judge);

    assert.equal(result.outcome.accepted, 0, 'no se le pregunta por el stack, así que no opina');
    assert.equal(result.outcome.rejected, 1);
    assert.deepEqual(seen, [], 'y ni se le manda: sería pagar tokens por una respuesta que se ignora');
  });

  it('EL CASO REAL (weworkremotely, 12 nov 2026): un rescate no entra sin una tecnología del núcleo', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await run([SQUARESPACE_JAVA], judge);

    assert.equal(result.outcome.accepted, 0, 'el veto cayó, pero sigue sin haber nada suyo en el anuncio');
    assert.equal(result.outcome.rejected, 1);
  });

  it('el juez sigue pudiendo vetar lo que las reglas aceptaron', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: 'onsite', reason: 'pide ir a la oficina' }));
    const result = await run([BUENA], judge);

    assert.equal(result.outcome.accepted, 0);
    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.match(stored.items[0]!.rejectionReason ?? '', /^\[IA\] pide ir a la oficina/);
  });

  it('EL CASO REAL: el juez veta un puesto que no es de su oficio aunque las reglas lo acepten', async () => {
    const { judge } = fakeJudge(() => ({
      isOffer: true,
      rejection: 'role',
      reason: 'es un puesto de seguridad de redes, no de desarrollo',
    }));
    const result = await run([SEGURIDAD_DE_RED], judge);

    assert.equal(result.outcome.accepted, 0);
    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.match(stored.items[0]!.rejectionReason ?? '', /^\[IA\] es un puesto de seguridad de redes/);
  });

  it('un descarte de las reglas que el juez confirma conserva el motivo concreto de la regla', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: false, reason: 'no es una vacante' }));
    await run([PRESENCIAL], judge);

    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(
      stored.items[0]!.rejectionCode,
      'reject.onsite',
      'el motivo de la regla dice más que un "[IA] no es una vacante"',
    );
  });

  it('guarda cuándo la publicaron ellos y cuánta gente se postuló', async () => {
    const source = fakeSourceWithMetrics([BUENA], 298);
    await runPasses([source], { jobs, judge: null, profile: PROFILE, runId: 1, maxAgeDays: 90 });

    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    const job = stored.items[0]!;
    assert.equal(job.postedAt, '2026-11-02T10:00:00.000Z');
    assert.equal(job.applications, 298);
    assert.deepEqual(job.responseDays, { min: 23, max: 31 });
  });

  it('EL CASO REAL: una segunda pasada actualiza las postulaciones sin duplicar la oferta', async () => {
    await runPasses([fakeSourceWithMetrics([BUENA], 298)], { jobs, judge: null, profile: PROFILE, runId: 1, maxAgeDays: 90 });
    await runPasses([fakeSourceWithMetrics([BUENA], 310)], { jobs, judge: null, profile: PROFILE, runId: 2, maxAgeDays: 90 });

    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(stored.items.length, 1, 'una sola fila: la huella no cambió');
    assert.equal(stored.items[0]!.applications, 310, 'con el número de hoy, no el de la primera lectura');
  });

  it('refrescar los números NO toca el estado que él le puso a la oferta', async () => {
    await runPasses([fakeSourceWithMetrics([BUENA], 298)], { jobs, judge: null, profile: PROFILE, runId: 1, maxAgeDays: 90 });
    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    jobs.updateStatus(stored.items[0]!.id, JobStatus.Saved);

    await runPasses([fakeSourceWithMetrics([BUENA], 310)], { jobs, judge: null, profile: PROFILE, runId: 2, maxAgeDays: 90 });

    const after = jobs.findById(stored.items[0]!.id);
    assert.equal(after?.status, JobStatus.Saved, 'la guardó él; una lectura posterior no la devuelve a nuevas');
    assert.equal(after?.applications, 310);
  });

  it('una fuente que no publica números deja esos campos vacíos, sin inventar un cero', async () => {
    await run([BUENA], null);
    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(stored.items[0]!.applications, null, 'un 0 diría que no se ha postulado nadie');
    assert.equal(stored.items[0]!.postedAt, null);
  });

  it('EL CASO REAL: una vacante de hace ocho meses no entra, por buena que sea', async () => {
    const result = await runPasses([fakeSourceAged([BUENA], 240)], {
      jobs, judge: null, profile: PROFILE, runId: 1, maxAgeDays: 90,
    });

    assert.equal(result.outcome.accepted, 0);
    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.match(stored.items[0]!.rejectionReason ?? '', /^publicada hace 8 meses/);
  });

  it('justo dentro del tope sí entra: el corte son tres meses, no dos', async () => {
    const result = await runPasses([fakeSourceAged([BUENA], 80)], {
      jobs, judge: null, profile: PROFILE, runId: 1, maxAgeDays: 90,
    });
    assert.equal(result.outcome.accepted, 1);
  });

  it('NI EL JUEZ rescata una vacante vieja: una fecha no se opina', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await runPasses([fakeSourceAged([BUENA], 200)], {
      jobs, judge, profile: PROFILE, runId: 1, maxAgeDays: 90,
    });
    assert.equal(result.outcome.accepted, 0, 'el juez dijo que sirve, pero sigue siendo de hace medio año');
  });

  it('una oferta SIN fecha no se descarta: LinkedIn no la publica', async () => {
    const result = await run([BUENA], null);
    assert.equal(result.outcome.accepted, 1, 'tirar lo que no trae fecha apagaría esa fuente entera');
  });

  it('la lista sale por fecha de publicación, no por cuándo la leímos', async () => {
    await runPasses([fakeSourceAged([BUENA], 60)], { jobs, judge: null, profile: PROFILE, runId: 1, maxAgeDays: 90 });
    await runPasses([fakeSourceAged([OTRA_BUENA], 5)], { jobs, judge: null, profile: PROFILE, runId: 1, maxAgeDays: 90 });

    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.match(stored.items[0]!.text, /Otra vacante/, 'la de hace 5 días va primero');
  });

  it('sin juez manda la regla, y el descarte queda marcado como no juzgado', async () => {
    const result = await run([PRESENCIAL], null);

    assert.equal(result.outcome.accepted, 0);
    const stored = jobs.list({
      status: null, verdict: null, runId: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(stored.items[0]!.judgeStatus, JudgeStatus.Skipped);
  });
});
