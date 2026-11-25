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

describe('rutas del alta', () => {
  let dir: string;
  let db: Db;
  let app: FastifyInstance;
  let profiles: ProfileRepository;
  let settings: SettingsRepository;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'onboarding-test-'));
    db = openDatabase(dir);
    settings = new SettingsRepository(db);
    profiles = new ProfileRepository(settings);
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

  it('dejar el país vacío está permitido', async () => {
    assert.equal((await put({ geo: { country: '' } })).statusCode, 200);
  });

  it('el nivel de inglés tiene que ser de la escala', async () => {
    assert.equal((await put({ english: { level: 'altísimo', filter: true } })).statusCode, 400);
  });

  it('una instalación nueva busca desarrollo de software hasta que elijas otro oficio', async () => {
    assert.deepEqual(profiles.get().roles, ['software']);
    const res = await app.inject({ method: 'GET', url: '/api/onboarding' });
    assert.ok((res.json() as { catalogue: { roles: string[] } }).catalogue.roles.includes('qa'));
  });

  it('el oficio se guarda, y no se acepta ninguno inventado ni quedarse sin oficio', async () => {
    assert.equal((await put({ roles: ['qa', 'devops'] })).statusCode, 200);
    assert.deepEqual(profiles.get().roles, ['qa', 'devops']);
    assert.equal((await put({ roles: ['astronauta'] })).statusCode, 400);
    assert.equal((await put({ roles: [] })).statusCode, 400);
    assert.equal((await put({ roles: 'qa' })).statusCode, 400);
    assert.deepEqual(profiles.get().roles, ['qa', 'devops']);
  });

  it('una instalación nueva no sabe tus años y tiene todos los niveles marcados: no filtra por nivel', () => {
    assert.deepEqual(profiles.get().experience, { years: null, levels: ['trainee', 'junior', 'semi', 'senior', 'lead'] });
  });

  it('los años y los niveles se guardan, y vaciar los años vuelve a "no lo he dicho"', async () => {
    assert.equal((await put({ experience: { years: 9, levels: ['semi', 'senior'] } })).statusCode, 200);
    assert.deepEqual(profiles.get().experience, { years: 9, levels: ['semi', 'senior'] });
    assert.equal((await put({ experience: { years: null, levels: ['semi', 'senior'] } })).statusCode, 200);
    assert.equal(profiles.get().experience.years, null);
  });

  it('unos años imposibles, un nivel inventado o ningún nivel se rechazan en vez de guardarse', async () => {
    const levels = ['senior'];
    assert.equal((await put({ experience: { years: -1, levels } })).statusCode, 400);
    assert.equal((await put({ experience: { years: 'muchos', levels } })).statusCode, 400);
    assert.equal((await put({ experience: { years: 80, levels } })).statusCode, 400);
    assert.equal((await put({ experience: { years: 3, levels: ['guru'] } })).statusCode, 400);
    assert.equal((await put({ experience: { years: 3, levels: [] } })).statusCode, 400);
  });

  it('un perfil guardado con el filtro de antes (años + margen) pasa a los niveles que propone', () => {
    settings.set('candidateProfile', JSON.stringify({ experience: { years: 9, filter: true } }));
    assert.deepEqual(profiles.get().experience.levels, ['semi', 'senior', 'lead']);
    settings.set('candidateProfile', JSON.stringify({ experience: { years: 9, filter: false } }));
    assert.equal(profiles.get().experience.levels.length, 5);
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
