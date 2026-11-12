import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LoginWall, loginWallAdvice, loginWallOf } from './login-wall.js';

describe('loginWallOf', () => {
  it('el feed cargado no es un muro', () => {
    assert.equal(loginWallOf('https://www.linkedin.com/feed/'), null);
    assert.equal(loginWallOf('https://www.linkedin.com/feed/?trk=nav'), null);
  });

  it('reconoce que nos mandaron al login', () => {
    assert.equal(loginWallOf('https://www.linkedin.com/login'), LoginWall.Login);
    assert.equal(loginWallOf('https://www.linkedin.com/uas/login?session_redirect=%2Ffeed'), LoginWall.Login);
    assert.equal(loginWallOf('https://es.infojobs.net/iniciar-sesion'), LoginWall.Login);
  });

  it('el checkpoint gana al login aunque la URL lleve las dos palabras', () => {
    assert.equal(
      loginWallOf('https://www.linkedin.com/checkpoint/challenge/verify?loginSubmitSource=x'),
      LoginWall.Checkpoint,
    );
  });

  it('reconoce el muro de invitados', () => {
    assert.equal(loginWallOf('https://www.linkedin.com/authwall?trk=gf'), LoginWall.AuthWall);
  });

  it('una palabra en el dominio o en el query no basta', () => {
    assert.equal(loginWallOf('https://login.example.com/feed/'), null);
  });

  it('una URL que no se puede parsear se juzga como texto, sin explotar', () => {
    assert.equal(loginWallOf('/uas/login'), LoginWall.Login);
    assert.equal(loginWallOf(''), null);
  });

  it('cada muro dice qué hacer y nombra la plataforma', () => {
    for (const wall of Object.values(LoginWall)) {
      const advice = loginWallAdvice(wall, 'linkedin');
      assert.match(advice, /linkedin/);
      assert.match(advice, /npm run login/);
    }
  });
});
