import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { openDatabase, type Db } from '../db/database.js';
import { SettingsRepository } from '../db/settings.repository.js';
import type { Focus } from './focus.js';
import { markSeen, withNews } from './news.js';

function focusWith(names: string[], terms: string[] = []): Focus {
  return {
    analysed: 10,
    windowDays: 180,
    topics: names.map((name) => ({
      name, area: 'practicas' as const, vacancies: 3, share: 30, known: false, examples: [],
    })),
    emerging: terms.map((term) => ({ term, vacancies: 2, example: null })),
  };
}

describe('withNews — qué apareció desde la última vez', () => {
  let dir: string;
  let db: Db;
  let settings: SettingsRepository;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'news-test-'));
    db = openDatabase(dir);
    settings = new SettingsRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('LA PRIMERA VEZ no marca nada: 39 temas resaltados no son un aviso', () => {
    const focus = withNews(focusWith(['Docker', 'AWS']), settings);

    assert.equal(focus.newCount, 0);
    assert.ok(focus.topics.every((t) => !t.isNew));
  });

  it('lo que no estaba la vez anterior sale marcado', () => {
    withNews(focusWith(['Docker']), settings);
    const despues = withNews(focusWith(['Docker', 'Terraform']), settings);

    assert.equal(despues.newCount, 1);
    assert.equal(despues.topics.find((t) => t.name === 'Terraform')?.isNew, true);
    assert.equal(despues.topics.find((t) => t.name === 'Docker')?.isNew, false);
  });

  it('MIRAR NO ES VER: leer la pantalla dos veces no apaga el resaltado', () => {
    withNews(focusWith(['Docker']), settings);
    const primera = withNews(focusWith(['Docker', 'Terraform']), settings);
    const segunda = withNews(focusWith(['Docker', 'Terraform']), settings);

    assert.equal(primera.newCount, 1);
    assert.equal(segunda.newCount, 1, 'sigue sin verse hasta que él salga de la página');
  });

  it('al salir se apaga, y no vuelve', () => {
    withNews(focusWith(['Docker']), settings);
    const conNovedad = withNews(focusWith(['Docker', 'Terraform']), settings);
    markSeen(conNovedad, settings);

    assert.equal(withNews(focusWith(['Docker', 'Terraform']), settings).newCount, 0);
  });

  it('los términos de «Apareciendo» también se marcan', () => {
    withNews(focusWith(['Docker']), settings);
    const despues = withNews(focusWith(['Docker']), settings);
    assert.equal(despues.newCount, 0);

    const conTermino = withNews(focusWith(['Docker'], ['Snowflake']), settings);
    assert.equal(conTermino.newCount, 1);
    assert.equal(conTermino.emerging[0]?.isNew, true);
  });

  it('cambiar la ventana no resucita avisos ya vistos', () => {
    markSeen(focusWith(['Docker', 'AWS', 'Terraform']), settings);
    markSeen(focusWith(['Docker']), settings);

    assert.equal(withNews(focusWith(['Docker', 'AWS', 'Terraform']), settings).newCount, 0);
  });
});
