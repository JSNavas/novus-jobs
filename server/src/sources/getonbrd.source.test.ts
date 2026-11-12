import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { GetOnBoardSource } from './getonbrd.source.js';

const CATEGORIES = {
  data: [
    { id: 'programming', type: 'category', attributes: { name: 'Programming' } },
    { id: 'sales', type: 'category', attributes: { name: 'Sales' } },
  ],
};

function apiJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'full-stack-node-react-acme-remote',
    type: 'job',
    attributes: {
      title: 'Full-Stack Engineer Senior',
      description: '<ul><li>Node.js y TypeScript en producción.</li><li>React.</li></ul>',
      functions: '<p>Construir y mantener servicios.</p>',
      desirable: '<ul><li>AWS</li></ul>',
      remote: true,
      remote_modality: 'full_remote',
      countries: ['Remote'],
      min_salary: 2800,
      max_salary: 3000,
      category_name: 'Programming',
      applications_count: 58,
      company: { data: { attributes: { name: 'Acme' } } },
      seniority: { data: { attributes: { name: 'Senior' } } },
      ...overrides,
    },
  };
}

function page(jobs: unknown[], totalPages = 1) {
  return { data: jobs, meta: { page: 1, per_page: 100, total_pages: totalPages } };
}

describe('GetOnBoardSource — del JSON al anuncio', () => {
  const realFetch = globalThis.fetch;
  let calls: string[];

  function stub(reply: (url: string) => { body: unknown; status?: number } | null): void {
    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith('https://www.getonbrd.com/api/v0/categories')) {
        return new Response(JSON.stringify(CATEGORIES), { status: 200 });
      }
      const answer = reply(url);
      if (!answer) return new Response('nope', { status: 500 });
      return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 });
    }) as typeof globalThis.fetch;
  }

  beforeEach(() => {
    calls = [];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function read() {
    return new GetOnBoardSource().fetch(() => []);
  }

  it('vuelca puesto, empresa, nivel, modalidad y sueldo antes del cuerpo', async () => {
    stub(() => ({ body: page([apiJob()]) }));
    const [post] = await read();

    assert.ok(post);
    const head = post.text.split('\n\n')[0]!;
    assert.match(head, /^Acme busca: Full-Stack Engineer Senior$/m);
    assert.match(head, /^Nivel: Senior$/m);
    assert.match(head, /^Modalidad: 100% remoto$/m);
    assert.match(head, /^Sueldo: USD 2800 - 3000 al mes$/m);
    assert.equal(post.author, 'Acme');
  });

  it('usa la URL canónica con su categoría, que es la que el filtro reconoce como vía de postulación', async () => {
    stub(() => ({ body: page([apiJob()]) }));
    const [post] = await read();

    const url = 'https://www.getonbrd.com/jobs/programming/full-stack-node-react-acme-remote';
    assert.equal(post!.url, url);
    assert.ok(post!.text.includes(`Postular: ${url}`), 'el enlace va también en el texto: de ahí lo lee `extractApplyUrl`');
  });

  it('si el mapa de categorías falla, sigue con la URL de respaldo en vez de perder la pasada', async () => {
    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/categories')) throw new Error('se cayó la red');
      return new Response(JSON.stringify(page([apiJob()])), { status: 200 });
    }) as typeof globalThis.fetch;

    const [post] = await read();
    assert.equal(post!.url, 'https://www.getonbrd.com/empleos/full-stack-node-react-acme-remote');
  });

  it('"Remote" NO es un país: no se escribe línea de ubicación que el anuncio no dice', async () => {
    stub(() => ({ body: page([apiJob()]) }));
    const [post] = await read();

    assert.ok(!/Remoto para:|Ubicación:/.test(post!.text), 'inventar el país descarta por el motivo equivocado');
  });

  it('un remoto restringido a países sí los nombra, para que las reglas de ubicación puedan verlo', async () => {
    stub(() => ({ body: page([apiJob({ countries: ['Chile', 'Perú'] })]) }));
    const [post] = await read();

    assert.match(post!.text, /^Remoto para: Chile, Perú$/m);
  });

  it('un presencial se declara presencial, con su país', async () => {
    stub(() => ({ body: page([apiJob({ remote: false, remote_modality: 'hybrid', countries: ['Chile'] })]) }));
    const [post] = await read();

    assert.match(post!.text, /^Modalidad: híbrido$/m);
    assert.match(post!.text, /^Ubicación: Chile$/m);
  });

  it('el HTML del anuncio llega como texto con guiones, no con etiquetas', async () => {
    stub(() => ({ body: page([apiJob()]) }));
    const [post] = await read();

    assert.ok(!/<[a-z/]/i.test(post!.text), 'ni una etiqueta: las reglas y el juez leen texto plano');
    assert.match(post!.text, /- Node\.js y TypeScript en producción\./);
    assert.match(post!.text, /Requisitos:/);
    assert.match(post!.text, /Funciones del cargo:/);
  });

  it('NADA VOLÁTIL en el texto: si no, la huella cambia y la misma vacante entra como nueva cada día', async () => {
    stub(() => ({ body: page([apiJob()]) }));
    const [primera] = await read();
    stub(() => ({ body: page([apiJob({ applications_count: 4321 })]) }));
    const [segunda] = await read();

    assert.equal(primera!.text, segunda!.text, 'las postulaciones suben a diario y no son parte del anuncio');
  });

  it('pagina hasta donde dice la respuesta y no una página más', async () => {
    stub((url) => {
      const page2 = url.includes('page=2');
      return { body: page([apiJob({ title: page2 ? 'Segunda' : 'Primera' })], 2) };
    });
    const posts = await read();

    assert.equal(posts.length, 2);
    assert.equal(calls.filter((u) => u.includes('search/jobs')).length, 2, 'dos páginas pedidas, no tres');
  });

  it('un 200 sin vacantes utilizables se grita: es contrato roto, no un día tranquilo', async () => {
    stub(() => ({ body: page([]) }));
    await assert.rejects(read(), /sin vacantes utilizables/);
  });

  it('un error HTTP dice el código, para no tener que adivinar por qué no hubo ofertas', async () => {
    stub(() => ({ body: { message: 'nope' }, status: 503 }));
    await assert.rejects(read(), /respondió 503/);
  });

  it('una vacante sin título se salta sin tumbar las demás', async () => {
    stub(() => ({ body: page([apiJob({ title: '' }), apiJob()]) }));
    const posts = await read();

    assert.equal(posts.length, 1);
  });
});
