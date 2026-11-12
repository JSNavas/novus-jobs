import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DescriptorError, first, parseDescriptor, pick } from './descriptor.js';

const MINIMAL = {
  name: 'remotive',
  request: { url: 'https://remotive.com/api/remote-jobs' },
  fields: { list: 'jobs', title: 'title', description: 'description' },
};

describe('parseDescriptor', () => {
  it('con lo mínimo basta: una URL, la lista, el título y la descripción', () => {
    const descriptor = parseDescriptor(MINIMAL);
    assert.equal(descriptor.name, 'remotive');
    assert.equal(descriptor.label, 'remotive');
    assert.equal(descriptor.request.method, 'GET');
    assert.deepEqual(descriptor.fields.title, ['title']);
  });

  it('un camino suelto vale igual que una lista, porque a mano se escribe suelto', () => {
    const descriptor = parseDescriptor({
      ...MINIMAL,
      fields: { ...MINIMAL.fields, url: ['url', 'apply_url'] },
    });
    assert.deepEqual(descriptor.fields.url, ['url', 'apply_url']);
  });

  it('sin título o sin descripción se niega: sin eso no hay vacante que filtrar', () => {
    assert.throws(
      () => parseDescriptor({ ...MINIMAL, fields: { list: 'jobs', title: 'title' } }),
      DescriptorError,
    );
  });

  it('http se niega: un descriptor viene de fuera y no va a mandar peticiones en claro', () => {
    assert.throws(
      () => parseDescriptor({ ...MINIMAL, request: { url: 'http://remotive.com/api' } }),
      DescriptorError,
    );
  });

  it('el nombre es clave en la base y en la URL, así que no admite mayúsculas ni espacios', () => {
    assert.throws(() => parseDescriptor({ ...MINIMAL, name: 'Remote OK' }), DescriptorError);
  });

  it('un body sin POST es un descriptor mal escrito, no un body que se ignora en silencio', () => {
    assert.throws(
      () => parseDescriptor({ ...MINIMAL, request: { ...MINIMAL.request, body: { q: 'dev' } } }),
      DescriptorError,
    );
  });

  it('Workday pide POST con cuerpo JSON, y por eso el descriptor lo admite', () => {
    const descriptor = parseDescriptor({
      ...MINIMAL,
      name: 'un-banco',
      request: {
        url: 'https://banco.wd3.myworkdayjobs.com/wday/cxs/banco/careers/jobs',
        method: 'POST',
        body: { appliedFacets: {}, limit: 20, offset: 0 },
      },
    });
    assert.equal(descriptor.request.method, 'POST');
    assert.deepEqual(descriptor.request.body, { appliedFacets: {}, limit: 20, offset: 0 });
  });

  it('una versión que no entendemos se dice, en vez de leerla a medias', () => {
    assert.throws(() => parseDescriptor({ ...MINIMAL, version: 9 }), DescriptorError);
  });

  it('el tope de páginas lo pone el proyecto, no el descriptor: nadie barre un portal entero', () => {
    const descriptor = parseDescriptor({
      ...MINIMAL,
      request: { ...MINIMAL.request, paging: { param: 'page', max: 5000 } },
    });
    assert.equal(descriptor.request.paging?.max, 20);
  });
});

describe('pick y first', () => {
  it('un camino de puntos entra en lo anidado, que es donde Get on Board pone la empresa', () => {
    const entry = { company: { data: { attributes: { name: 'Lemon.io' } } } };
    assert.equal(pick(entry, 'company.data.attributes.name'), 'Lemon.io');
  });

  it('un camino nulo es la raíz, porque Remote OK devuelve el array sin envolver', () => {
    const payload = [{ position: 'Dev' }];
    assert.deepEqual(pick(payload, null), payload);
  });

  it('un camino que se corta no revienta: devuelve nada y se prueba el siguiente', () => {
    assert.equal(pick({ a: 1 }, 'a.b.c'), undefined);
  });

  it('el primer camino con algo gana, y así un rename no rompe el descriptor', () => {
    const entry = { url: '', apply_url: 'https://x.test/1' };
    assert.equal(first(entry, ['url', 'apply_url']), 'https://x.test/1');
  });
});
