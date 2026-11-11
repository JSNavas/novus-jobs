import type { FastifyInstance } from 'fastify';
import { buildFocus } from '../analysis/focus.js';
import type { JobsRepository } from '../db/jobs.repository.js';
import type { CandidateProfile } from '../filters/decide.js';
import { JobVerdict } from '../types.js';

/**
 * Qué piden en común las vacantes que le sirven.
 *
 * Se calcula al vuelo y no se guarda: con dos centenares de ofertas tarda
 * milisegundos, y un cálculo guardado envejece sin avisar — quedaría
 * enseñando el enfoque de la semana pasada sin que nada lo delate.
 */
export interface FocusRoutesDeps {
  jobs: JobsRepository;
  profile: CandidateProfile;
}

/** Todo lo aceptado. El tope de tres meses ya lo aplicó el pipeline al entrar. */
const MAX_JOBS = 500;

export function registerFocusRoute(app: FastifyInstance, deps: FocusRoutesDeps): void {
  /** Entre un mes y dos años. Fuera de ahí manda la de fábrica, sin romperse. */
  const windowDays = (raw: unknown): number | undefined => {
    const months = Number(raw);
    return Number.isInteger(months) && months >= 1 && months <= 24 ? months * 30 : undefined;
  };

  app.get('/api/focus', (request) => {
    const page = deps.jobs.list({
      status: null,
      verdict: JobVerdict.Accepted,
      runId: null,
      seniority: null,
      source: null,
      search: null,
      hasApply: null,
      limit: MAX_JOBS,
      offset: 0,
    });
    const months = (request.query as { months?: unknown } | undefined)?.months;
    return buildFocus(page.items, deps.profile, { windowDays: windowDays(months) });
  });
}
