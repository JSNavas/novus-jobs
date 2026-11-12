import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Mailer } from './mailer.js';

const CONFIG = { apiKey: 'k', from: 'novus@example.com', to: '' };

describe('Mailer — destinatario y alcance', () => {
  it('sin destinatario no hay correo, aunque haya clave y remitente', () => {
    const mailer = new Mailer(CONFIG, { to: () => null, onlyNewOffers: () => false });
    assert.equal(mailer.enabled(), false);
  });

  it('el destinatario elegido en la aplicación manda sobre el del fichero', () => {
    const mailer = new Mailer(
      { ...CONFIG, to: 'del-fichero@example.com' },
      { to: () => 'elegido@example.com', onlyNewOffers: () => false },
    );
    assert.equal(mailer.recipient(), 'elegido@example.com');
    assert.equal(mailer.enabled(), true);
  });

  it('sin elección se usa el del fichero', () => {
    const mailer = new Mailer(
      { ...CONFIG, to: 'del-fichero@example.com' },
      { to: () => null, onlyNewOffers: () => false },
    );
    assert.equal(mailer.recipient(), 'del-fichero@example.com');
  });

  it('«solo ofertas nuevas» calla los avisos de fallo pero no los de ofertas', () => {
    // Lo pedido: que el correo llegue cuando aparece algo que encaja y nada más.
    // El coste es real y por eso es una elección: una sesión caducada deja de avisar.
    const mailer = new Mailer(CONFIG, { to: () => 'yo@example.com', onlyNewOffers: () => true });
    assert.equal(mailer.enabled(), true);
    assert.equal(mailer.warnsEnabled(), false);
  });

  it('sin esa preferencia, los fallos también avisan', () => {
    const mailer = new Mailer(CONFIG, { to: () => 'yo@example.com', onlyNewOffers: () => false });
    assert.equal(mailer.warnsEnabled(), true);
  });

  it('sin clave ni remitente no se manda nada', () => {
    const mailer = new Mailer(null, { to: () => 'yo@example.com', onlyNewOffers: () => false });
    assert.equal(mailer.enabled(), false);
    assert.equal(mailer.warnsEnabled(), false);
  });
});
