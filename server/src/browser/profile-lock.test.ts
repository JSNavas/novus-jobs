import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { isProfileBusy, profileLockHolder } from './profile-lock.js';

describe('profileLockHolder', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'profile-lock-'));
    mkdirSync(join(dir, 'profile'), { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const profile = (): string => join(dir, 'profile');
  const lock = (): string => join(profile(), 'SingletonLock');

  it('sin SingletonLock el perfil está libre', () => {
    assert.equal(profileLockHolder(profile()), null);
    assert.equal(isProfileBusy(profile()), false);
  });

  it('un lock que apunta a un proceso VIVO ocupa el perfil', () => {
    symlinkSync(`${hostname()}-${process.pid}`, lock());
    assert.equal(profileLockHolder(profile()), process.pid);
    assert.equal(isProfileBusy(profile()), true);
  });

  it('un lock HUÉRFANO (pid muerto) deja el perfil libre', () => {
    symlinkSync(`${hostname()}-4194305`, lock());
    assert.equal(profileLockHolder(profile()), null);
    assert.equal(isProfileBusy(profile()), false);
  });

  it('un lock que no es un symlink no bloquea nada', () => {
    writeFileSync(lock(), 'basura');
    assert.equal(profileLockHolder(profile()), null);
  });

  it('un lock con un destino ilegible no bloquea nada', () => {
    symlinkSync('sin-pid-aqui', lock());
    assert.equal(profileLockHolder(profile()), null);
  });

  it('un perfil que no existe está libre', () => {
    assert.equal(profileLockHolder(join(dir, 'no-existe')), null);
  });
});
