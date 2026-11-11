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

/**
 * EL CRUCE ENTRE LAS REGLAS Y EL JUEZ, que es donde se perdían las ofertas.
 *
 * Antes el juez solo veía lo que las reglas habían aceptado, así que un falso
 * descarte por regex no tenía vuelta: se guardaba descartado y nadie lo volvía
 * a mirar. Medido sobre el feed real: 117 descartes y 114 sin pasar por el juez.
 */

/** Una vacante buena: las reglas la aceptan solas. */
const BUENA =
  'Buscamos Full Stack Senior 100% remoto para LATAM. Stack: Node.js, React, PostgreSQL. Sueldo USD 3000. Postula: https://lnkd.in/dxyz';

/** Otra vacante buena, para poder comparar el orden de dos. */
const OTRA_BUENA =
  'Otra vacante: buscamos Backend Senior 100% remoto para LATAM. Stack: Node.js, TypeScript, PostgreSQL. Sueldo USD 3500. Postula: https://lnkd.in/dotra';

/** Presencial en Barcelona: las reglas la descartan por ubicación. */
const PRESENCIAL =
  'Full-Stack Developer (Senior). Ubicacion: Barcelona, Espana. Modalidad presencial. Buscamos un/a Full-Stack Developer con Node.js, React y AWS. Contrato indefinido. Postula en https://lnkd.in/dabc';

/**
 * Las reglas la ACEPTAN —menciona Python, que está en el núcleo— pero el puesto
 * no es de desarrollo. Caso tomado de la pasada 15 del 2026-11-11.
 */
const SEGURIDAD_DE_RED =
  'Freelanly | Ingeniero de Seguridad de Red. Estados Unidos. USD 102000-138000/ano. El cliente necesita un Ingeniero de Seguridad de Red para firewalls, VPN y segmentacion. Scripting en Python deseable. Remoto. Postula: https://lnkd.in/dseg';

/** No menciona nada de su stack: descarte de los que el juez NO puede tocar. */
const SIN_STACK =
  'Buscamos Contador Senior 100% remoto para LATAM. Responsabilidades: conciliaciones, impuestos y cierres mensuales. Sueldo USD 2000. Postula en jobs@acme.com';

/** Una fuente cuyas ofertas se publicaron hace `days` días. */
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

/** Como `fakeSource`, pero con los números que publica la plataforma. */
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

/**
 * Juez de mentira. `verdicts` recibe las ofertas que el pipeline decidió
 * mandarle, así que sirve además para comprobar QUÉ se le manda.
 */
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
          junior: false,
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
    return runPasses([fakeSource(texts)], { jobs, judge, profile: PROFILE, runId: 1 });
  }

  it('EL CASO REAL: rescata una oferta que la regla de ubicación había descartado', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await run([PRESENCIAL], judge);

    assert.equal(result.outcome.accepted, 1, 'el juez dijo que sirve, así que entra');
    assert.equal(result.outcome.rejected, 0);

    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
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
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    const job = stored.items[0]!;
    assert.equal(job.locationKind, JobLocation.Unknown, 'ya no es "presencial": nadie lo sabe');
    assert.equal(job.isUncertain, true, 'entra marcada como por confirmar, no como oferta limpia');
  });

  it('lo descartado por el stack NO lo rescata el juez, ni aunque diga que sirve', async () => {
    const { judge, seen } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await run([SIN_STACK], judge);

    assert.equal(result.outcome.accepted, 0, 'no se le pregunta por el stack, así que no opina');
    assert.equal(result.outcome.rejected, 1);
    assert.deepEqual(seen, [], 'y ni se le manda: sería pagar tokens por una respuesta que se ignora');
  });

  it('el juez sigue pudiendo vetar lo que las reglas aceptaron', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: 'onsite', reason: 'pide ir a la oficina' }));
    const result = await run([BUENA], judge);

    assert.equal(result.outcome.accepted, 0);
    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.match(stored.items[0]!.rejectionReason ?? '', /^\[IA\] pide ir a la oficina/);
  });

  it('EL CASO REAL: el juez veta un puesto que no es de su oficio aunque las reglas lo acepten', async () => {
    // La pasada 15 aceptó "Ingeniero de Seguridad de Red" porque el anuncio
    // menciona Python, que está en el núcleo. Las reglas no saben de oficios:
    // en cuanto una tecnología del núcleo aparece, dejan pasar. El juez sí.
    const { judge } = fakeJudge(() => ({
      isOffer: true,
      rejection: 'role',
      reason: 'es un puesto de seguridad de redes, no de desarrollo',
    }));
    const result = await run([SEGURIDAD_DE_RED], judge);

    assert.equal(result.outcome.accepted, 0);
    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.match(stored.items[0]!.rejectionReason ?? '', /^\[IA\] es un puesto de seguridad de redes/);
  });

  it('un descarte de las reglas que el juez confirma conserva el motivo concreto de la regla', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: false, reason: 'no es una vacante' }));
    await run([PRESENCIAL], judge);

    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(
      stored.items[0]!.rejectionReason,
      'presencial o híbrido fuera de Venezuela',
      'el motivo de la regla dice más que un "[IA] no es una vacante"',
    );
  });

  /* ═══ LOS NÚMEROS DE LA PLATAFORMA ═══
   * Van en columnas y no en el texto justamente para esto: cambian cada día,
   * y la huella que deduplica es un sha1 del texto. */

  it('guarda cuándo la publicaron ellos y cuánta gente se postuló', async () => {
    const source = fakeSourceWithMetrics([BUENA], 298);
    await runPasses([source], { jobs, judge: null, profile: PROFILE, runId: 1 });

    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    const job = stored.items[0]!;
    assert.equal(job.postedAt, '2026-11-02T10:00:00.000Z');
    assert.equal(job.applications, 298);
    assert.deepEqual(job.responseDays, { min: 23, max: 31 });
  });

  it('EL CASO REAL: una segunda pasada actualiza las postulaciones sin duplicar la oferta', async () => {
    // 298 el lunes y 310 el martes. Si el número viviera en el texto, la huella
    // cambiaría y la misma vacante entraría otra vez como nueva.
    await runPasses([fakeSourceWithMetrics([BUENA], 298)], { jobs, judge: null, profile: PROFILE, runId: 1 });
    await runPasses([fakeSourceWithMetrics([BUENA], 310)], { jobs, judge: null, profile: PROFILE, runId: 2 });

    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(stored.items.length, 1, 'una sola fila: la huella no cambió');
    assert.equal(stored.items[0]!.applications, 310, 'con el número de hoy, no el de la primera lectura');
  });

  it('refrescar los números NO toca el estado que él le puso a la oferta', async () => {
    await runPasses([fakeSourceWithMetrics([BUENA], 298)], { jobs, judge: null, profile: PROFILE, runId: 1 });
    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    jobs.updateStatus(stored.items[0]!.id, JobStatus.Saved);

    await runPasses([fakeSourceWithMetrics([BUENA], 310)], { jobs, judge: null, profile: PROFILE, runId: 2 });

    const after = jobs.findById(stored.items[0]!.id);
    assert.equal(after?.status, JobStatus.Saved, 'la guardó él; una lectura posterior no la devuelve a nuevas');
    assert.equal(after?.applications, 310);
  });

  it('una fuente que no publica números deja esos campos vacíos, sin inventar un cero', async () => {
    await run([BUENA], null);
    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(stored.items[0]!.applications, null, 'un 0 diría que no se ha postulado nadie');
    assert.equal(stored.items[0]!.postedAt, null);
  });

  /* ═══ EL TOPE DE TRES MESES ═══
   * De 27 aceptadas el 2026-11-11, 14 llevaban más de dos meses publicadas, y
   * la primera era de noviembre de 2025 con 969 postulaciones. */

  it('EL CASO REAL: una vacante de hace ocho meses no entra, por buena que sea', async () => {
    const result = await runPasses([fakeSourceAged([BUENA], 240)], {
      jobs, judge: null, profile: PROFILE, runId: 1,
    });

    assert.equal(result.outcome.accepted, 0);
    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.match(stored.items[0]!.rejectionReason ?? '', /^publicada hace 8 meses/);
  });

  it('justo dentro del tope sí entra: el corte son tres meses, no dos', async () => {
    const result = await runPasses([fakeSourceAged([BUENA], 80)], {
      jobs, judge: null, profile: PROFILE, runId: 1,
    });
    assert.equal(result.outcome.accepted, 1);
  });

  it('NI EL JUEZ rescata una vacante vieja: una fecha no se opina', async () => {
    const { judge } = fakeJudge(() => ({ isOffer: true, rejection: null }));
    const result = await runPasses([fakeSourceAged([BUENA], 200)], {
      jobs, judge, profile: PROFILE, runId: 1,
    });
    assert.equal(result.outcome.accepted, 0, 'el juez dijo que sirve, pero sigue siendo de hace medio año');
  });

  it('una oferta SIN fecha no se descarta: LinkedIn no la publica', async () => {
    const result = await run([BUENA], null);
    assert.equal(result.outcome.accepted, 1, 'tirar lo que no trae fecha apagaría esa fuente entera');
  });

  it('la lista sale por fecha de publicación, no por cuándo la leímos', async () => {
    // Las dos se leen en la misma pasada: si se ordenara por `found_at`, el
    // orden lo decidiría el azar del recorrido.
    await runPasses([fakeSourceAged([BUENA], 60)], { jobs, judge: null, profile: PROFILE, runId: 1 });
    await runPasses([fakeSourceAged([OTRA_BUENA], 5)], { jobs, judge: null, profile: PROFILE, runId: 1 });

    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.match(stored.items[0]!.text, /Otra vacante/, 'la de hace 5 días va primero');
  });

  it('sin juez manda la regla, y el descarte queda marcado como no juzgado', async () => {
    const result = await run([PRESENCIAL], null);

    assert.equal(result.outcome.accepted, 0);
    const stored = jobs.list({
      status: null, verdict: null, runId: null, seniority: null,
      source: null, search: null, hasApply: null, limit: 10, offset: 0,
    });
    assert.equal(stored.items[0]!.judgeStatus, JudgeStatus.Skipped);
  });
});
