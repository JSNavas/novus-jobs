import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LlmJudge, POSTS_PER_CALL } from './judge.js';
import type { CandidateProfile, Offer } from './decide.js';

const PERFIL: CandidateProfile = {
  language: 'es',
  stack: ['Node.js'], core: ['Node.js'], cannotDo: ['Java'],
  english: { level: 'b1', filter: true },
  experience: { years: null, filter: true },
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

describe('LlmJudge — el nivel sale del perfil, no de quien escribió el proyecto', () => {
  async function promptFor(profile: CandidateProfile, answer = respuesta(1)): Promise<{ prompt: string; verdicts: unknown }> {
    let prompt = '';
    const client = {
      models: {
        async generateContent(request: { contents: string }) {
          prompt = request.contents;
          return answer;
        },
      },
    };
    const verdicts = await new LlmJudge(client as never, 'modelo-de-prueba').judge(offers(1), profile);
    return { prompt, verdicts };
  }

  it('un junior: el modelo sabe sus años y puede descartar lo que pide mucho más', async () => {
    const { prompt } = await promptFor({ ...PERFIL, experience: { years: 1, filter: true } });
    assert.match(prompt, /Experiencia: 1 años/);
    assert.match(prompt, /"seniority"\s+→ EXIGEN bastante más experiencia que sus 1 años/);
    assert.match(prompt, /más de 3 años/, 'el margen es el mismo que el de la regla');
  });

  it('sin años declarados no se descarta por nivel', async () => {
    const { prompt } = await promptFor(PERFIL);
    assert.match(prompt, /No ha dicho cuántos años de experiencia tiene: no descartes por nivel/);
    assert.match(prompt, /"seniority"\s+→ no lo uses/);
  });

  it('con el filtro apagado ve todos los niveles aunque diga sus años', async () => {
    const { prompt } = await promptFor({ ...PERFIL, experience: { years: 2, filter: false } });
    assert.match(prompt, /NO descartes por nivel: quiere verlas igual/);
    assert.match(prompt, /"seniority"\s+→ no lo uses/);
  });

  it('"seniority" es un descarte que el pipeline entiende', async () => {
    const answer = { text: '[{"i":0,"esOferta":true,"descarte":"seniority","esAgregador":false,"motivo":"piden 8 años"}]' };
    const { verdicts } = await promptFor({ ...PERFIL, experience: { years: 1, filter: true } }, answer);
    assert.equal((verdicts as { rejection: string }[])[0]?.rejection, 'seniority');
  });
});
