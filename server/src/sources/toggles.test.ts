import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SourceToggles, enabledKey } from './toggles.js';

class FakeSettings {
  private readonly values = new Map<string, string>();
  get(key: string): string | null { return this.values.get(key) ?? null; }
  set(key: string, value: string): void { this.values.set(key, value); }
}

/**
 * El interruptor tiene que respetar lo que ya había montado. Quien quitó
 * LinkedIn de `JOB_SOURCES` lo quitó a propósito, y al actualizar no puede
 * encontrarse con que su cuenta vuelve a leerse sola.
 */
describe('SourceToggles', () => {
  it('sin nada guardado manda el JOB_SOURCES del .env', () => {
    const toggles = new SourceToggles(new FakeSettings(), ['getonbrd']);
    assert.equal(toggles.isEnabled('getonbrd'), true);
    assert.equal(toggles.isEnabled('linkedin'), false);
  });

  it('lo guardado manda sobre el .env, en los dos sentidos', () => {
    const settings = new FakeSettings();
    const toggles = new SourceToggles(settings, ['getonbrd']);
    toggles.set('linkedin', true);
    toggles.set('getonbrd', false);
    assert.equal(toggles.isEnabled('linkedin'), true);
    assert.equal(toggles.isEnabled('getonbrd'), false);
    assert.equal(settings.get(enabledKey('linkedin')), 'true');
  });

  it('una fuente que el .env no nombraba se puede encender: por eso se construyen todas', () => {
    const toggles = new SourceToggles(new FakeSettings(), []);
    assert.equal(toggles.isEnabled('infojobs'), false);
    toggles.set('infojobs', true);
    assert.equal(toggles.isEnabled('infojobs'), true);
  });
});
