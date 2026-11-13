import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { jobPostings, pageLinks, readableText } from './jsonld.js';
import { looksLikeABotWall, PageReader } from './reader.js';
import { parseDescriptor } from './descriptor.js';

const PAGINA = `<!doctype html><html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"JobPosting","title":"Full Stack Developer - Remoto LATAM",
 "description":"Buscamos un perfil con Node.js y React.",
 "datePosted":"2026-05-20","hiringOrganization":{"@type":"Organization","name":"Azka IT Consulting"},
 "jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Ciudad de México"}},
 "url":"https://azka-it.viterbit.site/full-stack-developer-remoto-latam-ql4dZPLuTJqH/"}
</script></head><body><nav>Menú</nav><p>Requisitos del puesto</p></body></html>`;

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?><urlset>
<url><loc>https://azka-it.viterbit.site/full-stack-developer-remoto-latam-ql4dZPLuTJqH/</loc></url>
<url><loc>https://azka-it.viterbit.site/account-manager-oil-gas-o-g-DVQqUvJl4jmI/</loc></url>
<url><loc>https://azka-it.viterbit.site/privacy/</loc></url>
<url><loc>https://otro-sitio.com/una-vacante-ajena-abcdefgh/</loc></url>
</urlset>`;

describe('jobPostings', () => {
  it('EL CASO REAL (Azka IT): la vacante no está en ninguna API, está en el JobPosting de su página', () => {
    const [oferta] = jobPostings(PAGINA);
    assert.equal(oferta?.title, 'Full Stack Developer - Remoto LATAM');
  });

  it('lo encuentra aunque venga envuelto en un @graph, que es como lo escriben muchos', () => {
    const envuelto = `<script type="application/ld+json">
      {"@graph":[{"@type":"Organization","name":"Acme"},{"@type":"JobPosting","title":"Backend"}]}
    </script>`;
    assert.deepEqual(jobPostings(envuelto).map((p) => p.title), ['Backend']);
  });

  it('un JSON-LD roto no tumba la página entera', () => {
    assert.deepEqual(jobPostings('<script type="application/ld+json">{ roto</script>'), []);
  });
});

describe('pageLinks', () => {
  it('lee las direcciones del sitemap, que es lo que el muro antibot sí deja pasar', () => {
    const links = pageLinks(SITEMAP, 'https://azka-it.viterbit.site/sitemap.xml');
    assert.equal(links.length, 2, 'ni la de privacidad ni la de otro dominio');
    assert.ok(links.every((l) => l.startsWith('https://azka-it.viterbit.site/')));
  });

  it('no se sale del sitio: una vacante de otro dominio no es de esta empresa', () => {
    const links = pageLinks(SITEMAP, 'https://azka-it.viterbit.site/sitemap.xml');
    assert.ok(!links.some((l) => l.includes('otro-sitio.com')));
  });
});

describe('readableText', () => {
  it('se queda con lo que se lee, no con lo que se ejecuta', () => {
    const texto = readableText(PAGINA);
    assert.ok(texto.includes('Requisitos del puesto'));
    assert.ok(!texto.includes('@context'), 'el JSON-LD ya se leyó aparte: aquí solo estorba');
    assert.ok(!texto.includes('Menú'));
  });
});

describe('looksLikeABotWall', () => {
  it('EL CASO REAL: Cloudflare contesta 403 con "Just a moment"', () => {
    assert.equal(looksLikeABotWall(403, '<title>Just a moment...</title>'), true);
  });

  it('un 403 de verdad no es un muro: puede ser que la dirección no sea pública', () => {
    assert.equal(looksLikeABotWall(403, '{"error":"forbidden"}'), false);
  });

  it('ni un 404, por mucho que hable de verificación', () => {
    assert.equal(looksLikeABotWall(404, 'security verification'), false);
  });
});

describe('la ventana y las pasadas', () => {
  it('EL CASO REAL: una pasada programada no abre ventanas solas en mitad del día', async () => {
    const reader = new PageReader(null, false);
    await assert.rejects(() => reader.read('https://azka-it.viterbit.site/', true), /muro antibot/);
  });

  it('el mensaje dice por qué no puede correr sola, no solo que falló', async () => {
    const reader = new PageReader(null, false);
    await reader.read('https://azka-it.viterbit.site/', true).catch((error: unknown) => {
      assert.match(String(error), /no puede correr sola/);
    });
  });
});

describe('descriptor jsonld', () => {
  it('no hace falta escribir el mapeo: JobPosting es un estándar y ya se sabe dónde mira', () => {
    const d = parseDescriptor({
      version: 1,
      name: 'azka-it',
      request: { url: 'https://azka-it.viterbit.site/', format: 'jsonld' },
      fields: {},
    });
    assert.deepEqual(d.fields.title, ['title']);
    assert.deepEqual(d.fields.company, ['hiringOrganization.name']);
    assert.ok(d.fields.location.includes('jobLocation.address.addressLocality'));
  });

  it('pero lo que el descriptor sí diga manda sobre el estándar', () => {
    const d = parseDescriptor({
      version: 1,
      name: 'azka-it',
      request: { url: 'https://azka-it.viterbit.site/', format: 'jsonld' },
      fields: { title: 'name' },
    });
    assert.deepEqual(d.fields.title, ['name']);
  });

  it('los demás formatos siguen exigiendo que se les diga dónde mirar', () => {
    assert.throws(
      () => parseDescriptor({ version: 1, name: 'x', request: { url: 'https://x.com/' }, fields: {} }),
      /fields.title/,
    );
  });
});
