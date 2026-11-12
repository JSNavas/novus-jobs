import type { FastifyInstance } from 'fastify';
import { buildFocus } from '../analysis/focus.js';
import type { JobsRepository } from '../db/jobs.repository.js';
import { markSeen, withNews } from '../analysis/news.js';
import type { SettingsRepository } from '../db/settings.repository.js';
import type { CandidateProfile } from '../filters/decide.js';
import { JobVerdict } from '../types.js';

export interface FocusRoutesDeps {
  jobs: JobsRepository;
  profile: () => CandidateProfile;
  settings: SettingsRepository;
}

const MAX_JOBS = 500;

export function registerFocusRoute(app: FastifyInstance, deps: FocusRoutesDeps): void {
  const windowDays = (raw: unknown): number | undefined => {
    const months = Number(raw);
    return Number.isInteger(months) && months >= 1 && months <= 24 ? months * 30 : undefined;
  };

  const accepted = () => deps.jobs.list({
    status: null,
    verdict: JobVerdict.Accepted,
    runId: null,
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

  app.post('/api/focus/seen', () => {
    markSeen(buildFocus(accepted(), deps.profile(), { windowDays: 24 * 30 }), deps.settings);
    return { ok: true };
  });
}
