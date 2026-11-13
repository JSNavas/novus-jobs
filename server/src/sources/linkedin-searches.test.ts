import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanSearch, LinkedInSearches, SearchNotFromLinkedInError } from './linkedin-searches.js';
import { LINKEDIN_JOBS_URL } from './linkedin-jobs.source.js';
import { pageUrl } from './linkedin-jobs.source.js';

const PREFERENCIAS = 'https://www.linkedin.com/jobs/search-results/?currentJobId=4318510399'
  + '&keywords=Full%20Stack&origin=PREFERENCES_LANDING'
  + '&originToLandingJobPostings=4318510399%2C4482707196&geoId=100446943';

function store(valor?: string) {
  let guardado = valor;
  return {
    repo: {
      get: () => guardado ?? null,
      set: (_k: string, v: string) => { guardado = v; },
    },
    get value() { return guardado; },
  };
}

describe('cleanSearch', () => {
  it('EL CASO REAL: la URL que copias del navegador trae la oferta que estabas mirando', () => {
    const limpia = cleanSearch(PREFERENCIAS);
    assert.ok(!limpia.includes('currentJobId'), 'esa oferta es de ese momento, no de la búsqueda');
    assert.ok(!limpia.includes('originToLandingJobPostings'));
    assert.match(limpia, /keywords=Full\+Stack/);
    assert.match(limpia, /geoId=100446943/);
  });

  it('quita el "start" para no congelar la lista en una página', () => {
    assert.ok(!cleanSearch(`${LINKEDIN_JOBS_URL}?start=50`).includes('start'));
  });

  it('una dirección que no es de empleos de LinkedIn no entra', () => {
    assert.throws(() => cleanSearch('https://example.com/jobs/'), SearchNotFromLinkedInError);
    assert.throws(() => cleanSearch('https://www.linkedin.com/feed/'), SearchNotFromLinkedInError);
  });
});

describe('LinkedInSearches', () => {
  it('sin nada guardado lee la lista que LinkedIn arma con tu perfil', () => {
    assert.deepEqual(new LinkedInSearches(store().repo).urls(), [LINKEDIN_JOBS_URL]);
  });

  it('guarda sin repetir y sin líneas en blanco', () => {
    const s = store();
    const urls = new LinkedInSearches(s.repo).save([LINKEDIN_JOBS_URL, '  ', LINKEDIN_JOBS_URL, PREFERENCIAS]);
    assert.equal(urls.length, 2);
  });

  it('vaciarlo devuelve la de fábrica: quedarse sin ninguna apagaría la fuente en silencio', () => {
    const s = store();
    const searches = new LinkedInSearches(s.repo);
    searches.save([PREFERENCIAS]);
    assert.deepEqual(searches.save([]), [LINKEDIN_JOBS_URL]);
  });
});

describe('pageUrl', () => {
  it('la primera página va sin parámetro, como la escribe una persona', () => {
    assert.equal(pageUrl(LINKEDIN_JOBS_URL, 0), LINKEDIN_JOBS_URL);
  });

  it('las siguientes añaden start sin pisar lo que la dirección ya traía', () => {
    const url = pageUrl(`${LINKEDIN_JOBS_URL}?keywords=node`, 25);
    assert.match(url, /keywords=node/);
    assert.match(url, /start=25/);
  });
});
