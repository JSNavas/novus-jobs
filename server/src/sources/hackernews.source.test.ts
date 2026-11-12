import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { HackerNewsSource } from './hackernews.source.js';

const realFetch = globalThis.fetch;

const STORIES = {
  hits: [
    { objectID: '50338726', title: 'Ask HN: Who wants to be hired? (November 2026)' },
    { objectID: '50338728', title: 'Ask HN: Who is hiring? (November 2026)' },
  ],
};

const LONG = 'Buscamos alguien que sepa Go y Postgres para un equipo pequeño y remoto.';

function serve(comments: readonly Record<string, unknown>[]): void {
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const href = String(input);
    const payload = href.includes('search_by_date') ? STORIES : { hits: comments };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('HackerNewsSource', () => {
  it('coge el hilo de contratar, no el de que te contraten: los dos los publica whoishiring', async () => {
    serve([{ objectID: '1', parent_id: 50338728, story_id: 50338728, comment_text: `<p>Acme | Backend | REMOTE</p><p>${LONG}</p>` }]);
    const [post] = await new HackerNewsSource().fetch(() => []);
    assert.match(post?.text ?? '', /Hilo: Ask HN: Who is hiring\? \(November 2026\)/);
  });

  it('la cabecera del comentario es "Empresa | Puesto | …", y de ahí salen las dos cosas', async () => {
    serve([{ objectID: '7', parent_id: 50338728, story_id: 50338728, comment_text: `<p>Acme | Backend Engineer | REMOTE</p><p>${LONG}</p>` }]);
    const [post] = await new HackerNewsSource().fetch(() => []);
    assert.equal(post?.employer, 'Acme');
    assert.match(post?.text ?? '', /^Acme busca: Backend Engineer \| REMOTE\n/);
    assert.equal(post?.url, 'https://news.ycombinator.com/item?id=7');
  });

  it('una respuesta a una oferta no es una oferta: solo entra el primer nivel', async () => {
    serve([
      { objectID: '1', parent_id: 50338728, story_id: 50338728, comment_text: `<p>Acme | Backend | REMOTE</p><p>${LONG}</p>` },
      { objectID: '2', parent_id: 1, story_id: 50338728, comment_text: `<p>¿Aceptáis gente de LATAM? ${LONG}</p>` },
    ]);
    const posts = await new HackerNewsSource().fetch(() => []);
    assert.equal(posts.length, 1);
    assert.equal(posts[0]?.employer, 'Acme');
  });

  it('un comentario de dos líneas no es una oferta: hay saludos y bromas en el hilo', async () => {
    serve([
      { objectID: '3', parent_id: 50338728, story_id: 50338728, comment_text: '<p>Buena suerte a todos</p>' },
      { objectID: '4', parent_id: 50338728, story_id: 50338728, comment_text: `<p>Acme | Backend | REMOTE</p><p>${LONG}</p>` },
    ]);
    const posts = await new HackerNewsSource().fetch(() => []);
    assert.equal(posts.length, 1);
  });

  it('si no hay hilo del mes se dice, en vez de devolver una pasada vacía', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ hits: [] }), { status: 200 })) as typeof fetch;
    await assert.rejects(() => new HackerNewsSource().fetch(() => []), /Who is hiring/);
  });

  it('no pide cuenta ni navegador: es una API pública', () => {
    const source = new HackerNewsSource();
    assert.equal(source.profileId, null);
    assert.equal(source.loginUrl, null);
    assert.equal(source.name, 'hackernews');
  });
});
