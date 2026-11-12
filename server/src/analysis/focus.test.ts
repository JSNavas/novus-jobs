import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFILE } from '../profile/profile.js';
import { JobLocation, JobSeniority, JobStatus, JobVerdict, JudgeStatus, type Job } from '../types.js';
import { buildFocus } from './focus.js';

/**
 * EL ENFOQUE ES UNA LISTA DE ESTUDIO, así que lo que hay que fijar es que no
 * mienta: que cuente vacantes y no menciones, que no cuele la publicidad de la
 * empresa entre los requisitos, y que un tema que sale en una sola vacante no
 * pase por patrón.
 */
function job(text: string, id = 1): Job {
  return {
    id, source: 'getonbrd', fingerprint: `fp-${id}`, title: 'Oferta', role: 'Developer',
    company: null, author: 'Empresa', text, url: null, location: null,
    locationKind: JobLocation.Global, verdict: JobVerdict.Accepted,
    rejectionReason: null, rejectionCode: null, rejectionParams: null,
    seniority: JobSeniority.Regular, isAggregator: false, isUncertain: false,
    judgeStatus: JudgeStatus.Judged, status: JobStatus.New, foundAt: '2026-11-11T00:00:00.000Z',
    postedAt: null, stackMatch: [], applyUrl: null, contactEmail: null, runId: 1,
    applications: null, responseDays: null,
  };
}

const CON_TERRAFORM = `Requisitos:
- Experiencia con infraestructura como código mediante Terraform.
- Experiencia con Docker y pipelines de CI/CD mediante GitHub Actions.`;

const OTRA_CON_TERRAFORM = `Requisitos:
- Manejo de Terraform para aprovisionar entornos reproducibles.
- Conocimiento de contenedores y despliegue continuo.`;

describe('buildFocus — qué piden en común las vacantes', () => {
  it('sin vacantes no inventa nada', () => {
    const focus = buildFocus([], PROFILE);
    assert.equal(focus.analysed, 0);
    assert.deepEqual(focus.topics, []);
  });

  it('un tema en UNA sola vacante no es un patrón, es una empresa', () => {
    const focus = buildFocus([job(CON_TERRAFORM)], PROFILE);
    assert.equal(focus.topics.find((t) => t.name === 'Terraform'), undefined);
  });

  it('EL CASO REAL: lo que dos vacantes piden igual sale con su frase original', () => {
    const focus = buildFocus([job(CON_TERRAFORM, 1), job(OTRA_CON_TERRAFORM, 2)], PROFILE);
    const terraform = focus.topics.find((t) => t.name === 'Terraform');

    assert.ok(terraform, 'dos vacantes lo piden: es un patrón');
    assert.equal(terraform.vacancies, 2);
    assert.equal(terraform.share, 100);
    assert.equal(terraform.known, false, 'no está en su stack: va a la lista de estudio');
    assert.match(terraform.examples[0] ?? '', /infraestructura como código/);
  });

  it('cuenta VACANTES, no menciones: repetir AWS catorce veces no lo hace más pedido', () => {
    const repetitiva = job(`Requisitos:
- Experiencia con AWS en producción.
- Más AWS, mucho AWS, AWS por todas partes y AWS otra vez.`, 1);
    const focus = buildFocus([repetitiva, job(CON_TERRAFORM, 2)], PROFILE);

    assert.equal(focus.topics.find((t) => t.name === 'AWS'), undefined, 'solo una vacante lo pide');
  });

  it('la publicidad de la empresa NO entra en la lista de requisitos', () => {
    const conRuido = `Somos una empresa con excelente ambiente laboral y Docker.
Beneficios:
- Excelente ambiente laboral y seguro médico de primera para ti y tu familia.
Requisitos:
- Experiencia con Docker y orquestación de contenedores en producción.`;
    const focus = buildFocus([job(conRuido, 1), job(CON_TERRAFORM, 2)], PROFILE);
    const docker = focus.topics.find((t) => t.name === 'Docker');

    assert.ok(docker);
    assert.ok(
      docker.examples.every((e) => !e.includes('ambiente laboral')),
      'una lista de estudio con "excelente ambiente laboral" no se usa dos veces',
    );
  });

  it('lo que ya está en su stack se marca como sabido, para separarlo de lo que toca estudiar', () => {
    const conNode = `Requisitos:
- Experiencia desarrollando servicios backend con Node.js y TypeScript.`;
    const focus = buildFocus([job(conNode, 1), job(conNode.replace('backend', 'de backend'), 2)], PROFILE);

    assert.equal(focus.topics.find((t) => t.name === 'Node.js')?.known, true);
  });

  it('EL CASO REAL: una frase que vale para varios temas se enseña UNA vez', () => {
    // Pasó de verdad: «Soltura con JavaScript/TypeScript (idealmente
    // Next.js/React) y bases de datos SQL» salía bajo cuatro temas. Leída
    // cuatro veces, una frase deja de informar y empieza a estorbar.
    const compartida = '- Soltura con JavaScript, TypeScript y React en proyectos de producción.';
    const texto = `Requisitos:
${compartida}
- Experiencia desarrollando interfaces con React y sus patrones habituales.
- Experiencia sólida escribiendo TypeScript con tipado estricto.
- Conocimientos de JavaScript moderno y sus novedades recientes.`;
    const focus = buildFocus([job(texto, 1), job(texto, 2)], PROFILE);

    const todas = focus.topics.flatMap((t) => t.examples);
    assert.equal(
      todas.filter((e) => e === compartida.slice(2)).length,
      1,
      'cada tema tiene frases propias: la compartida se enseña una sola vez',
    );
  });

  it('pero antes de quedarse muda, una fila repite frase', () => {
    // Si TODAS sus frases se las llevaron otros temas, repetir una es mejor
    // que enseñar un número suelto que nadie puede interpretar.
    const unica = '- Soltura con JavaScript, TypeScript y React en proyectos de producción.';
    const focus = buildFocus([job(`Requisitos:\n${unica}`, 1), job(`Requisitos:\n${unica}`, 2)], PROFILE);

    assert.ok(
      focus.topics.every((t) => t.examples.length > 0),
      'ninguna fila se queda sin una sola frase',
    );
  });

  it('la frase se la queda el tema MÁS pedido, que es el que más se lee', () => {
    const compartida = '- Experiencia con TypeScript y con Elasticsearch en producción diaria.';
    const soloTs = '- Experiencia sólida con TypeScript en servicios backend reales.';
    const focus = buildFocus([
      job(`Requisitos:\n${compartida}`, 1),
      job(`Requisitos:\n${compartida}`, 2),
      job(`Requisitos:\n${soloTs}`, 3),
    ], PROFILE);

    const ts = focus.topics.find((t) => t.name === 'TypeScript');
    const elastic = focus.topics.find((t) => t.name === 'Elasticsearch');
    assert.equal(ts?.vacancies, 3);
    assert.equal(elastic?.vacancies, 2);
    assert.ok(ts?.examples.includes(compartida.slice(2)), 'TypeScript sale en 3 vacantes: se la queda');
    assert.ok(!elastic?.examples.includes(compartida.slice(2)) || elastic.examples.length === 1);
  });

  it('ningún tema se queda mudo: con un número y sin frase no se entiende', () => {
    // «Machine learning» salía con 3 vacantes y cero ejemplos, porque lo
    // pedían en prosa y no en una viñeta.
    const enProsa = 'Buscamos a alguien con experiencia en machine learning aplicado a producto real.';
    const focus = buildFocus([job(enProsa, 1), job(enProsa, 2)], PROFILE);

    const ml = focus.topics.find((t) => t.name === 'Machine learning');
    assert.ok(ml, 'dos vacantes lo piden');
    assert.ok(ml.examples.length > 0, 'una fila sin una sola frase no se entiende');
  });

  it('ordena por cuántas vacantes lo piden', () => {
    const focus = buildFocus(
      [job(CON_TERRAFORM, 1), job(OTRA_CON_TERRAFORM, 2), job(`Requisitos:\n- Docker y contenedores en producción diaria.`, 3)],
      PROFILE,
    );
    const counts = focus.topics.map((t) => t.vacancies);
    assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
  });
});

/**
 * EL DETECTOR AUTOMÁTICO cierra el único agujero real del Enfoque: lo que no
 * está en el catálogo no se detecta por mucho que lo pidan. Lo que hay que
 * fijar aquí es que no proponga basura, porque una lista de hallazgos con
 * ruido se deja de mirar a la segunda vez.
 */
describe('findEmerging — lo que se repite y nadie clasificó', () => {
  const conTerraform = (n: number) => job(`Requisitos:
- Experiencia con Snowflake para el almacén de datos de la compañía.
- Conocimiento de Temporal para orquestar flujos de trabajo duraderos.`, n);

  it('encuentra una tecnología que el catálogo no tiene', () => {
    const focus = buildFocus([conTerraform(1), conTerraform(2)], PROFILE);
    const terminos = focus.emerging.map((e) => e.term);

    assert.ok(terminos.includes('Snowflake'), 'se repite en dos vacantes y no está en el catálogo');
    assert.ok(terminos.includes('Temporal'));
  });

  it('NO propone trozos de lo que el catálogo ya cuenta', () => {
    // Salía «CI», «CD», «IA» y «Cloud»: son partes de «CI/CD», «IA
    // generativa» y «Google Cloud». Descubrir media palabra que ya tienes no
    // es descubrir nada, y entierra lo que sí es nuevo.
    const texto = `Requisitos:
- Experiencia con Docker y pipelines de CI/CD mediante GitHub Actions.
- Trabajo con Google Cloud y despliegues de IA generativa en producción.`;
    const focus = buildFocus([job(texto, 1), job(texto, 2)], PROFILE);
    const terminos = focus.emerging.map((e) => e.term.toLowerCase());

    for (const trozo of ['ci', 'cd', 'ia', 'cloud', 'google', 'docker']) {
      assert.ok(!terminos.includes(trozo), `"${trozo}" ya está contado arriba`);
    }
  });

  it('el nombre de la empresa NO es una tecnología emergente', () => {
    // Una consultora con cincuenta vacantes publicadas sería, si no, «la
    // tecnología más demandada del mercado».
    const texto = 'Requisitos:\n- Experiencia trabajando con Acme en proyectos de larga duración.';
    const uno = { ...job(texto, 1), author: 'Acme', company: 'Acme' };
    const dos = { ...job(texto, 2), author: 'Acme', company: 'Acme' };
    const focus = buildFocus([uno, dos], PROFILE);

    assert.ok(!focus.emerging.some((e) => e.term.toLowerCase() === 'acme'));
  });

  it('una palabra en UNA sola vacante no asoma: sería una empresa, no una tendencia', () => {
    const focus = buildFocus([conTerraform(1), job('Requisitos:\n- Otra cosa cualquiera sin tecnologías.', 2)], PROFILE);
    assert.deepEqual(focus.emerging, []);
  });

  it('la ventana se puede estrechar, y entonces entran menos vacantes', () => {
    const viejo = { ...conTerraform(1), postedAt: new Date(Date.now() - 200 * 24 * 60 * 60_000).toISOString() };
    const nuevo = { ...conTerraform(2), postedAt: new Date().toISOString() };

    assert.equal(buildFocus([viejo, nuevo], PROFILE, { windowDays: 365 }).analysed, 2);
    assert.equal(buildFocus([viejo, nuevo], PROFILE, { windowDays: 90 }).analysed, 1);
  });
});
