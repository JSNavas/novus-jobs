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
import type { JobSource, RawPost } from './sources/types.js';
import { JobLocation, JobVerdict, JudgeStatus } from './types.js';

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

function fakeSource(texts: readonly string[]): JobSource {
  return {
    name: 'linkedin',
    label: 'LinkedIn',
    profileId: null,
    loginUrl: null,
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
