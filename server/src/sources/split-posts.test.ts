import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitMergedPosts } from './split-posts.js';

const HEADER = 'Natacha Carrizo\n• Siguiendo\nRecruiter | Talent Acquisition | LATAM';
const GENERICO = `${HEADER}\n🚀 ¡Seguimos buscando talento IT en LATAM!\nSi tenés experiencia con las tecnologías mencionadas, escribime por privado y te cuento más sobre la oportunidad. Gracias por ayudarme a conectar oportunidades con talento.`;
const OFERTA = `${HEADER}\n🚀 ¡Nueva oportunidad laboral! | Sr Fullstack Developer C++ / React / Node.js | LATAM\nBuscamos un perfil Senior con sólida experiencia en desarrollo backend con C++, tecnologías Fullstack modernas y optimización de sistemas de alto rendimiento.`;

describe('splitMergedPosts', () => {
  it('EL CASO REAL: separa las dos publicaciones de la misma recruiter', () => {
    const parts = splitMergedPosts(`${GENERICO}\n${OFERTA}`);
    assert.equal(parts.length, 2);
    assert.match(parts[0]!.text, /Seguimos buscando talento IT/);
    assert.match(parts[1]!.text, /Sr Fullstack Developer C\+\+/);
    // Ninguna venía sola: su enlace permanente no es de fiar.
    assert.deepEqual(parts.map((p) => p.alone), [false, false]);
  });

  it('una publicación normal se devuelve intacta y marcada como sola', () => {
    const parts = splitMergedPosts(OFERTA);
    assert.deepEqual(parts, [{ text: OFERTA, alone: true }]);
  });

  it('no parte si el nombre repetido deja trozos demasiado cortos', () => {
    // El autor se cita a sí mismo en una línea suelta: no es otra publicación.
    const text = `Ana Pérez\nBuscamos desarrollador Node.js remoto desde Venezuela con experiencia en NestJS y PostgreSQL para un equipo distribuido.\nAna Pérez`;
    assert.equal(splitMergedPosts(text).length, 1);
  });

  it('una primera línea demasiado larga no es un nombre y no se usa para partir', () => {
    const largo = 'Buscamos un desarrollador full stack senior con nueve años de experiencia demostrable en el sector';
    const text = `${largo}\nrequisitos y condiciones del puesto, con todo el detalle necesario para poder juzgarlo bien.\n${largo}`;
    assert.equal(splitMergedPosts(text).length, 1);
  });

  it('un texto vacío no explota', () => {
    assert.equal(splitMergedPosts('').length, 1);
  });
});
