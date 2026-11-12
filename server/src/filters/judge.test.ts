import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LlmJudge, POSTS_PER_CALL } from './judge.js';
import type { CandidateProfile, Offer } from './decide.js';

const PERFIL: CandidateProfile = {
  language: 'es',
  stack: ['Node.js'], core: ['Node.js'], cannotDo: ['Java'],
  english: { level: 'b1', filter: true },
  geo: { country: 'VE', city: null, timezone: 'America/Caracas', excludeLocalEmployers: true },
  modality: { remoteGlobal: true, remoteHomeCountry: true, hybrid: false, onsite: false },
};

function offers(n: number): Offer[] {
  return Array.from({ length: n }, (_, i) => ({ text: `vacante numero ${i}`, url: null, author: null }));
}

function respuesta(n: number): { text: string } {
  const items = Array.from({ length: n }, (_, i) =>
    `{"i":${i},"esOferta":true,"descarte":null,"esAgregador":false,"motivo":"ok"}`,
  );
  return { text: `[${items.join(',')}]` };
}

function fakeClient(guion: readonly (number | Error)[]) {
  let llamada = 0;
  return {
    models: {
      async generateContent() {
        const paso = guion[llamada++];
        if (paso instanceof Error) throw paso;
        return respuesta(paso ?? 0);
      },
    },
  };
}

function judgeWith(guion: readonly (number | Error)[]): LlmJudge {
  return new LlmJudge(fakeClient(guion) as never, 'modelo-de-prueba');
}

describe('LlmJudge.judge — una tanda caída no se lleva a las demás', () => {
  it('EL CASO REAL: la segunda tanda falla y los veredictos de la primera se conservan', async () => {
    const judge = judgeWith([POSTS_PER_CALL, new Error('400 invalid request')]);
    const verdicts = await judge.judge(offers(POSTS_PER_CALL + 5), PERFIL);

    assert.ok(verdicts, 'algo se pudo juzgar, así que no es null');
    assert.equal(verdicts.length, POSTS_PER_CALL, 'los de la primera tanda siguen ahí');
    assert.deepEqual(
      verdicts.map((v) => v.index),
      Array.from({ length: POSTS_PER_CALL }, (_, i) => i),
      'y con su índice original, para que el pipeline los cruce bien',
    );
  });

  it('los índices de la segunda tanda van desplazados, no vuelven a empezar en cero', async () => {
    const judge = judgeWith([POSTS_PER_CALL, 5]);
    const verdicts = await judge.judge(offers(POSTS_PER_CALL + 5), PERFIL);

    assert.equal(verdicts?.length, POSTS_PER_CALL + 5);
    assert.deepEqual(
      verdicts?.slice(POSTS_PER_CALL).map((v) => v.index),
      Array.from({ length: 5 }, (_, i) => POSTS_PER_CALL + i),
    );
  });

  it('si no se pudo juzgar NADA devuelve null y mandan las reglas', async () => {
    const judge = judgeWith([new Error('401 invalid api key')]);
    assert.equal(await judge.judge(offers(3), PERFIL), null);
  });

  it('sin ofertas no se llama al modelo', async () => {
    const judge = judgeWith([]);
    assert.deepEqual(await judge.judge([], PERFIL), null);
  });
});
