import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { BrowserPool } from './session.js';

describe('BrowserSession — la sesión sobrevive al cierre del navegador', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'browser-session-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const SESSION_COOKIE = {
    name: 'li_at',
    value: 'valor-de-prueba',
    domain: '.example.com',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None' as const,
    // Sin `expires`: es una cookie de sesión, como la de verdad.
  };

  async function cookieNamesOf(pool: BrowserPool): Promise<string[]> {
    const session = pool.session('linkedin');
    const ctx = await session.context();
    const cookies = await ctx.cookies('https://www.example.com');
    return cookies.map((c) => c.name);
  }

  it('una cookie de sesión se recupera en un navegador nuevo', async () => {
    const first = new BrowserPool(root, true);
    const session = first.session('linkedin');
    const ctx = await session.context();
    await ctx.addCookies([SESSION_COOKIE]);
    await session.rememberSession();
    await first.closeAll();

    const second = new BrowserPool(root, true);
    assert.ok((await cookieNamesOf(second)).includes('li_at'));
    await second.closeAll();
  });

  it('sin una lectura buena no se guarda nada que restaurar', async () => {
    const pool = new BrowserPool(root, true);
    assert.deepEqual(await cookieNamesOf(pool), []);
    await pool.closeAll();
  });

  it('olvidar la sesión la borra de verdad', async () => {
    const first = new BrowserPool(root, true);
    const session = first.session('linkedin');
    const ctx = await session.context();
    await ctx.addCookies([SESSION_COOKIE]);
    await session.rememberSession();
    session.forgetSession();
    await first.closeAll();

    const second = new BrowserPool(root, true);
    assert.deepEqual(await cookieNamesOf(second), []);
    await second.closeAll();
  });
});
