import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { openDatabase, type Db } from './database.js';
import { MOTIVATION_TEMPLATE_KEY, SettingsRepository } from './settings.repository.js';

describe('SettingsRepository', () => {
  let dir: string;
  let db: Db;
  let settings: SettingsRepository;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'settings-test-'));
    db = openDatabase(dir);
    settings = new SettingsRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('una clave que nunca se guardó devuelve null, no un error', () => {
    assert.equal(settings.get(MOTIVATION_TEMPLATE_KEY), null);
  });

  it('guarda y devuelve el valor', () => {
    settings.set(MOTIVATION_TEMPLATE_KEY, 'mi texto');
    assert.equal(settings.get(MOTIVATION_TEMPLATE_KEY), 'mi texto');
  });

  it('guardar otra vez la misma clave la sustituye', () => {
    settings.set(MOTIVATION_TEMPLATE_KEY, 'primera versión');
    settings.set(MOTIVATION_TEMPLATE_KEY, 'segunda versión');
    assert.equal(settings.get(MOTIVATION_TEMPLATE_KEY), 'segunda versión');
  });

  it('las claves no se pisan entre sí', () => {
    settings.set(MOTIVATION_TEMPLATE_KEY, 'motivación');
    settings.set('otra', 'otro valor');
    assert.equal(settings.get(MOTIVATION_TEMPLATE_KEY), 'motivación');
    assert.equal(settings.get('otra'), 'otro valor');
  });
});
