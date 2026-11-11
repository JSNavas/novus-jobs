import type { FastifyInstance } from 'fastify';
import { buildFocus } from '../analysis/focus.js';
import type { JobsRepository } from '../db/jobs.repository.js';
import { markSeen, withNews } from '../analysis/news.js';
import type { SettingsRepository } from '../db/settings.repository.js';
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
  /** Se lee en cada petición: el perfil cambia desde Configuración sin reiniciar. */
  profile: () => CandidateProfile;
  settings: SettingsRepository;
}

/** Todo lo aceptado. El tope de tres meses ya lo aplicó el pipeline al entrar. */
const MAX_JOBS = 500;

export function registerFocusRoute(app: FastifyInstance, deps: FocusRoutesDeps): void {
  /** Entre un mes y dos años. Fuera de ahí manda la de fábrica, sin romperse. */
  const windowDays = (raw: unknown): number | undefined => {
    const months = Number(raw);
    return Number.isInteger(months) && months >= 1 && months <= 24 ? months * 30 : undefined;
  };

  const accepted = () => deps.jobs.list({
    status: null,
    verdict: JobVerdict.Accepted,
    runId: null,
    seniority: null,
    source: null,
    search: null,
    hasApply: null,
    limit: MAX_JOBS,
    offset: 0,
  }).items;

  app.get('/api/focus', (request) => {
    const months = (request.query as { months?: unknown } | undefined)?.months;
    return withNews(buildFocus(accepted(), deps.profile(), { windowDays: windowDays(months) }), deps.settings);
  });

  /**
   * «Ya lo vi». Lo llama la pantalla AL SALIR, no al entrar: marcarlo al
   * entrar borraría el resaltado antes de que diera tiempo a leerlo.
   *
   * Se marca sobre la ventana más ancha y no sobre la que él estuviera
   * mirando: lo que ha visto es la pantalla, y un tema que solo asoma con
   * doce meses no debería quedar marcado por haber mirado tres... pero
   * tampoco al revés. Se usa la ancha porque equivocarse hacia «ya lo vio»
   * cuesta un aviso; equivocarse hacia «es nuevo» cuesta la confianza en el
   * resaltado entero.
   */
  app.post('/api/focus/seen', () => {
    markSeen(buildFocus(accepted(), deps.profile(), { windowDays: 24 * 30 }), deps.settings);
    return { ok: true };
  });
}
