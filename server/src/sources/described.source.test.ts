import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { DescribedSource } from './described.source.js';
import { parseDescriptor } from './descriptor.js';
import type { RawPost } from './types.js';

const realFetch = globalThis.fetch;

function reply(payload: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
}

function describedFrom(input: Record<string, unknown>): DescribedSource {
  return new DescribedSource(parseDescriptor(input));
}

async function onePost(source: DescribedSource): Promise<RawPost> {
  const posts = await source.fetch(() => []);
  const post = posts[0];
  assert.ok(post, 'se esperaba al menos una vacante');
  return post;
}

const REMOTIVE = {
  name: 'remotive',
  label: 'Remotive',
  request: { url: 'https://remotive.com/api/remote-jobs' },
  fields: {
    list: 'jobs',
    title: 'title',
    company: 'company_name',
    description: 'description',
    url: 'url',
    location: 'candidate_required_location',
    postedAt: 'publication_date',
  },
};

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('DescribedSource', () => {
  it('una vacante descrita se lee igual que una escrita a mano: cabecera y cuerpo', async () => {
    reply({
      jobs: [{
        title: 'Senior React Developer',
        company_name: 'Lemon.io',
        candidate_required_location: 'LATAM, Europe',
        description: '<p>Buscamos <b>React</b> y Node.</p><li>5 años</li>',
        url: 'https://remotive.com/remote-jobs/1',
        publication_date: '2026-11-10T18:25:05',
      }],
    });

    const post = await onePost(describedFrom(REMOTIVE));
    assert.equal(post.employer, 'Lemon.io');
    assert.equal(post.url, 'https://remotive.com/remote-jobs/1');
    assert.match(post.text, /^Lemon\.io busca: Senior React Developer\n/);
    assert.match(post.text, /Ubicación: LATAM, Europe/);
    assert.match(post.text, /Buscamos React y Node\./);
    assert.ok(!post.text.includes('<p>'));
  });

  it('el HTML se aplana, porque el filtro lee prosa y una etiqueta no es una palabra técnica', async () => {
    reply({ jobs: [{ title: 'Dev', description: '<div>Node.js</div><br/><li>AWS</li>' }] });
    const post = await onePost(describedFrom(REMOTIVE));
    assert.match(post.text, /Node\.js/);
    assert.match(post.text, /- AWS/);
  });

  it('Remote OK pone un aviso legal de primero, y skip lo salta sin inventar una vacante', async () => {
    reply([
      { legal: 'API Terms of Service: link back to Remote OK' },
      { position: 'Backend Engineer', company: 'Acme', description: 'Go y Postgres', url: 'https://remoteok.com/1' },
    ]);

    const posts = await describedFrom({
      name: 'remoteok',
      request: { url: 'https://remoteok.com/api' },
      fields: {
        list: null,
        skip: 1,
        title: 'position',
        company: 'company',
        description: 'description',
        url: 'url',
      },
    }).fetch(() => []);

    assert.equal(posts.length, 1);
    assert.equal(posts[0]?.employer, 'Acme');
  });

  it('una entrada sin título o sin descripción se tira, no entra como vacante vacía', async () => {
    reply({
      jobs: [
        { title: 'Sin cuerpo', description: '' },
        { title: '', description: 'Sin título' },
        { title: 'Buena', company_name: 'Acme', description: 'Node' },
      ],
    });
    const posts = await describedFrom(REMOTIVE).fetch(() => []);
    assert.equal(posts.length, 1);
    assert.match(posts[0]?.text ?? '', /Acme busca: Buena/);
  });

  it('las fechas llegan en segundos, en milisegundos o en texto, y salen en ISO', async () => {
    reply({ jobs: [{ title: 'Dev', description: 'Node', publication_date: 1762800000 }] });
    const post = await onePost(describedFrom(REMOTIVE));
    assert.equal(post.metrics?.postedAt, new Date(1762800000 * 1000).toISOString());
  });

  it('cero vacantes útiles es un fallo con nombre, no una pasada en blanco que parece normal', async () => {
    reply({ jobs: [] });
    await assert.rejects(
      () => describedFrom(REMOTIVE).fetch(() => []),
      /sin vacantes utilizables/,
    );
  });

  it('si la lista no está donde dice el descriptor, lo dice señalando fields.list', async () => {
    reply({ data: [{ title: 'Dev', description: 'Node' }] });
    await assert.rejects(() => describedFrom(REMOTIVE).fetch(() => []), /fields\.list/);
  });

  it('una respuesta que no es JSON dice que hace falta una fuente propia, no "error de red"', async () => {
    globalThis.fetch = (async () =>
      new Response('<rss><channel/></rss>', { status: 200 })) as typeof fetch;
    await assert.rejects(() => describedFrom(REMOTIVE).fetch(() => []), /solo lee APIs JSON/);
  });

  it('un 403 se cuenta con su código: es lo que distingue "me bloquearon" de "cambió la forma"', async () => {
    globalThis.fetch = (async () => new Response('no', { status: 403 })) as typeof fetch;
    await assert.rejects(() => describedFrom(REMOTIVE).fetch(() => []), /403/);
  });

  it('la misma vacante en dos páginas entra una vez: paginar no puede duplicar la bandeja', async () => {
    const page = { jobs: [{ title: 'Dev', company_name: 'Acme', description: 'Node', url: 'https://x.test/1' }] };
    reply(page);
    const posts = await describedFrom({
      ...REMOTIVE,
      request: { ...REMOTIVE.request, paging: { param: 'page', max: 3 } },
    }).fetch(() => []);
    assert.equal(posts.length, 1);
  });

  it('no pide sesión ni navegador: por eso una fuente descrita funciona el primer día', () => {
    const source = describedFrom(REMOTIVE);
    assert.equal(source.profileId, null);
    assert.equal(source.loginUrl, null);
    assert.equal(source.name, 'remotive');
    assert.equal(source.label, 'Remotive');
  });
});
