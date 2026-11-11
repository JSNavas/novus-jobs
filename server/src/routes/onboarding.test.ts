import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import Fastify, { type FastifyInstance } from 'fastify';
import { openDatabase, type Db } from '../db/database.js';
import { SettingsRepository } from '../db/settings.repository.js';
import { ProfileRepository } from '../profile/profile.repository.js';
import { registerOnboardingRoutes } from './onboarding.js';

/**
 * EL ALTA ES LA PRIMERA IMPRESIÓN y lo único que ve alguien que acaba de
 * clonar esto. Lo que se mide aquí es que guarde a trozos, que no acepte
 * basura, y sobre todo que no se cierre con un perfil con el que la búsqueda
 * descartaría todo lo que encuentre.
 */
describe('rutas del alta', () => {
  let dir: string;
  let db: Db;
  let app: FastifyInstance;
  let profiles: ProfileRepository;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'onboarding-test-'));
    db = openDatabase(dir);
    profiles = new ProfileRepository(new SettingsRepository(db));
    app = Fastify({ logger: false });
    registerOnboardingRoutes(app, { profiles, dataDir: dir, enhancer: null });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const put = (payload: object): Promise<{ statusCode: number; json: () => unknown }> =>
    app.inject({ method: 'PUT', url: '/api/onboarding/profile', payload });

  it('una instalación nueva no está dada de alta y trae el catálogo para los desplegables', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/onboarding' });
    const body = res.json() as { completed: boolean; catalogue: { countries: unknown[]; ecosystems: unknown[] } };
    assert.equal(body.completed, false);
    assert.ok(body.catalogue.countries.length > 10);
    assert.ok(body.catalogue.ecosystems.length > 5);
  });

  it('sin GEMINI_API_KEY no se ofrece la lectura con el modelo', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/onboarding' });
    assert.equal((res.json() as { canEnhance: boolean }).canEnhance, false);
  });

  /** Se puede cerrar el navegador en el paso 3 y volver mañana. */
  it('guarda paso a paso y un paso no borra lo del anterior', async () => {
    await put({ stack: ['TypeScript', 'React'], core: ['TypeScript'] });
    await put({ english: { level: 'b2', filter: true } });
    const profile = profiles.get();
    assert.deepEqual(profile.core, ['TypeScript']);
    assert.equal(profile.english.level, 'b2');
  });

  it('el veto se elige por ecosistema y se guarda como las tecnologías que mira el filtro', async () => {
    await put({ vetoEcosystems: ['jvm'] });
    const { cannotDo } = profiles.get();
    assert.ok(cannotDo.includes('Spring'));
    assert.ok(!cannotDo.includes('TypeScript'));
  });

  it('un ecosistema o un país que no existen se rechazan en vez de guardarse a medias', async () => {
    assert.equal((await put({ vetoEcosystems: ['no-existe'] })).statusCode, 400);
    assert.equal((await put({ geo: { country: 'ZZ' } })).statusCode, 400);
    assert.equal(profiles.get().geo.country, '');
  });

  /**
   * Sin país NO se rechaza: es un estado legítimo. Quien vive donde el dataset
   * no llega queda sin reglas de país, que es mejor que con las equivocadas.
   */
  it('dejar el país vacío está permitido', async () => {
    assert.equal((await put({ geo: { country: '' } })).statusCode, 200);
  });

  it('el nivel de inglés tiene que ser de la escala', async () => {
    assert.equal((await put({ english: { level: 'altísimo', filter: true } })).statusCode, 400);
  });

  it('no se cierra el alta sin una tecnología de núcleo', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/onboarding/complete' });
    assert.equal(res.statusCode, 400);
    assert.match((res.json() as { error: string }).error, /núcleo/);
    assert.equal(profiles.isOnboarded(), false);
  });

  it('con núcleo, el alta se cierra y queda la marca', async () => {
    await put({ core: ['Node.js'] });
    const res = await app.inject({ method: 'POST', url: '/api/onboarding/complete' });
    assert.equal(res.statusCode, 200);
    assert.equal(profiles.isOnboarded(), true);
  });
});
