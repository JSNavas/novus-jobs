import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LlmJudge, POSTS_PER_CALL } from './judge.js';
import type { CandidateProfile, Offer } from './decide.js';

const PERFIL: CandidateProfile = {
  language: 'es',
  roles: ['software'],
  stack: ['Node.js'], core: ['Node.js'], cannotDo: ['Java'],
  english: { level: 'b1', filter: true },
  experience: { years: null, levels: ['trainee', 'junior', 'semi', 'senior', 'lead'] },
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

  it('a senior who ticked Semi Senior and Senior: the model knows, and that Junior is not theirs', async () => {
    const { prompt } = await promptFor({ ...PERFIL, experience: { years: 9, levels: ['semi', 'senior'] } });
    assert.match(prompt, /Experiencia: 9 años\. Solo quiere puestos de nivel: semi senior/);
    const rule = prompt.slice(prompt.indexOf('"seniority"'), prompt.indexOf('"technology"'));
    assert.match(rule, /junior/);
    assert.doesNotMatch(rule, /semi senior/, 'what is ticked is not a reason to discard');
  });

  it('every level ticked: no level is a reason', async () => {
    const { prompt } = await promptFor(PERFIL);
    assert.match(prompt, /CUALQUIER nivel: no descartes por nivel/);
    assert.match(prompt, /"seniority"\s+→ no lo uses/);
  });

  it('"seniority" es un descarte que el pipeline entiende', async () => {
    const answer = { text: '[{"i":0,"esOferta":true,"descarte":"seniority","esAgregador":false,"motivo":"piden 8 años"}]' };
    const { verdicts } = await promptFor({ ...PERFIL, experience: { years: 1, levels: ['junior'] } }, answer);
    assert.equal((verdicts as { rejection: string }[])[0]?.rejection, 'seniority');
  });
});

describe('LlmJudge — el oficio sale del perfil', () => {
  async function promptFor(profile: CandidateProfile): Promise<string> {
    let prompt = '';
    const client = { models: { async generateContent(request: { contents: string }) { prompt = request.contents; return respuesta(1); } } };
    await new LlmJudge(client as never, 'modelo-de-prueba').judge(offers(1), profile);
    return prompt;
  }
  const roleRule = (prompt: string): string => prompt.slice(prompt.indexOf('"role"'), prompt.indexOf('null                →'));

  it('a QA: su oficio es QA, y QA no aparece entre lo que no es suyo', async () => {
    const prompt = await promptFor({ ...PERFIL, roles: ['qa'] });
    assert.match(prompt, /Su oficio: QA y testing/);
    assert.doesNotMatch(roleRule(prompt), /QA y testing/);
    assert.match(roleRule(prompt), /desarrollo de software/, 'para un QA, programar es otro oficio');
  });

  it('a developer keeps what the judge already discarded for them: QA, data, DevOps', async () => {
    const rule = roleRule(await promptFor(PERFIL));
    for (const other of ['QA y testing', 'datos', 'DevOps', 'soporte técnico', 'reclutamiento']) {
      assert.ok(rule.includes(other), `${other} sigue siendo otro oficio`);
    }
    assert.doesNotMatch(rule, /desarrollo de software/);
  });

  it('nobody is "un desarrollador" by default any more', async () => {
    assert.doesNotMatch(await promptFor({ ...PERFIL, roles: ['data'] }), /de un desarrollador/);
  });
});
