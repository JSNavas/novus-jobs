import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LlmJudge } from './judge.js';
import type { CandidateProfile, Offer } from './decide.js';

const PERFIL: CandidateProfile = {
  stack: ['Node.js'], core: ['Node.js'], cannotDo: ['Java'],
  english: { level: 'b1', filter: true },
  geo: { country: 'VE', city: null, timezone: 'America/Caracas', excludeLocalEmployers: true },
  modality: { remoteGlobal: true, remoteHomeCountry: true, hybrid: false, onsite: false },
};

function offers(n: number): Offer[] {
  return Array.from({ length: n }, (_, i) => ({ text: `vacante numero ${i}`, url: null, author: null }));
}

/** Respuesta válida del modelo para un lote de `n` publicaciones. */
function respuesta(n: number): { text: string } {
  const items = Array.from({ length: n }, (_, i) =>
    `{"i":${i},"esOferta":true,"descarte":null,"esJunior":false,"esAgregador":false,"motivo":"ok"}`,
  );
  return { text: `[${items.join(',')}]` };
}

/**
 * Cliente de mentira. `guion` dice qué hace cada llamada en orden: un número
 * devuelve una respuesta buena de ese tamaño, un Error lo lanza.
 */
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
    // 25 ofertas con POSTS_PER_CALL = 20 → dos tandas: 20 y 5.
    // El fallo es uno NO reintentable a propósito: con un 503 el juez reintenta
    // y el test se iría a cuatro segundos. Lo que se prueba —que la tanda buena
    // se conserva— no depende de por qué cayó la otra.
    const judge = judgeWith([20, new Error('400 invalid request')]);
    const verdicts = await judge.judge(offers(25), PERFIL);

    assert.ok(verdicts, 'algo se pudo juzgar, así que no es null');
    assert.equal(verdicts.length, 20, 'los 20 de la primera tanda siguen ahí');
    assert.deepEqual(
      verdicts.map((v) => v.index),
      Array.from({ length: 20 }, (_, i) => i),
      'y con su índice original, para que el pipeline los cruce bien',
    );
  });

  it('los índices de la segunda tanda van desplazados, no vuelven a empezar en cero', async () => {
    const judge = judgeWith([20, 5]);
    const verdicts = await judge.judge(offers(25), PERFIL);

    assert.equal(verdicts?.length, 25);
    assert.deepEqual(verdicts?.slice(20).map((v) => v.index), [20, 21, 22, 23, 24]);
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
