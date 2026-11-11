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
    locationKind: JobLocation.Global, verdict: JobVerdict.Accepted, rejectionReason: null,
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

  it('ordena por cuántas vacantes lo piden', () => {
    const focus = buildFocus(
      [job(CON_TERRAFORM, 1), job(OTRA_CON_TERRAFORM, 2), job(`Requisitos:\n- Docker y contenedores en producción diaria.`, 3)],
      PROFILE,
    );
    const counts = focus.topics.map((t) => t.vacancies);
    assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
  });
});
