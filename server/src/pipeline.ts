import type { JobsRepository, NewJob } from './db/jobs.repository.js';
import type { RunOutcome } from './db/runs.repository.js';
import { t } from './i18n/index.js';
import type { Language } from './profile/types.js';
import { matchStack } from './filters/offer.js';
import { isOwnRole } from './filters/requirements.js';
import { decideShipping, fingerprint, locationLabel, locationRejectionCode, storedText, type CandidateProfile, type Offer, type RejectedBy, type Verdict } from './filters/decide.js';
import { companyName, offerTitle, roleOnly, stripAuthorHeaders } from './filters/headline.js';
import type { LlmJudge, JudgeVerdict } from './filters/judge.js';
import { classifyFailure, failureMessage, worstFailure } from './sources/failure.js';
import type { JobSource, PostMetrics, RawPost } from './sources/types.js';
import { JobLocation, JudgeStatus, JobVerdict, type RunFailure } from './types.js';

interface PipelineDeps {
  maxAgeDays: number;
  jobs: JobsRepository;
  judge: LlmJudge | null;
  profile: CandidateProfile;
  runId: number;
  interactive?: boolean;
}

export interface SourceFailure {
  source: string;
  message: string;
  kind: RunFailure;
}

export interface PassResult {
  outcome: RunOutcome;
  accepted: NewJob[];
  failures: SourceFailure[];
  worst: RunFailure | null;
}

export async function runPasses(sources: readonly JobSource[], deps: PipelineDeps): Promise<PassResult> {
  const total: RunOutcome = { fetched: 0, accepted: 0, rejected: 0 };
  const accepted: NewJob[] = [];
  const failures: SourceFailure[] = [];
  for (const source of sources) {
    try {
      const { outcome, fresh } = await runSource(source, deps);
      accepted.push(...fresh);
      total.fetched += outcome.fetched;
      total.accepted += outcome.accepted;
      total.rejected += outcome.rejected;
    } catch (error) {
      const kind = classifyFailure(error);
      failures.push({ source: source.name, message: failureMessage(error), kind });
      console.warn(`[${source.name}] la pasada falló (${kind}): ${failureMessage(error)}`);
    }
  }
  return {
    outcome: total,
    accepted,
    failures,
    worst: failures.length ? worstFailure(failures.map((f) => f.kind)) : null,
  };
}

async function runSource(source: JobSource, deps: PipelineDeps): Promise<{ outcome: RunOutcome; fresh: NewJob[] }> {
  const seen = deps.jobs.fingerprintsOf(source.name);
  const isFresh = (text: string) => !seen.has(fingerprint(text));
  const posts = await source.fetch(
    (list) => indicesToFetchPermalink(list, deps.profile, isFresh),
    isFresh,
    deps.interactive ?? false,
  );
  const offers: Offer[] = posts.map(toOffer);
  const metricsOf = new Map(posts.map((post) => [fingerprint(post.text), post.metrics ?? null]));
  const employerOf = new Map(posts.map((post) => [fingerprint(post.text), post.employer ?? null]));
  const fresh = offers.filter((o) => isFresh(o.text));

  for (const post of posts) {
    const huella = fingerprint(post.text);
    if (!post.metrics || isFresh(post.text)) continue;
    deps.jobs.refreshMetrics(source.name, huella, post.metrics);
  }
  const now = Date.now();
  const judgeable = fresh.filter((o) => {
    const days = ageInDays(metricsOf.get(fingerprint(o.text))?.postedAt ?? null, now);
    return days === null || days <= deps.maxAgeDays;
  });
  const judged = await judgeOffers(judgeable, deps);

  const outcome: RunOutcome = { fetched: posts.length, accepted: 0, rejected: 0 };
  const stored: NewJob[] = [];
  for (const offer of fresh) {
    const metrics = metricsOf.get(fingerprint(offer.text)) ?? null;
    const ruleVerdict = decideShipping(offer, deps.profile);
    const judgment = judged.get(fingerprint(offer.text));
    const language = deps.profile.language;
    const verdict = rejectIfStale(
      applyJudgment(ruleVerdict, judgment, language, deps.profile, offer.text), metrics, now, deps.maxAgeDays, language,
    );
    const job = toNewJob(
      source.name,
      offer,
      verdict,
      judgment ? JudgeStatus.Judged : JudgeStatus.Skipped,
      deps.runId,
      metrics,
      employerOf.get(fingerprint(offer.text)) ?? null,
    );
    if (!deps.jobs.insert(job)) continue;
    if (verdict.accepted) {
      outcome.accepted++;
      stored.push(job);
    } else {
      outcome.rejected++;
    }
  }
  return { outcome, fresh: stored };
}

function indicesToFetchPermalink(posts: readonly RawPost[], profile: CandidateProfile, isFresh: (text: string) => boolean): number[] {
  return posts.flatMap((post, index) => {
    const wanted = isFresh(post.text) && decideShipping(toOffer(post), profile).accepted;
    return wanted ? [index] : [];
  });
}

function toOffer(post: RawPost): Offer {
  return { text: post.text, url: post.url, author: post.author };
}

const DAY_MS = 24 * 60 * 60_000;

function ageInDays(postedAt: string | null, now: number): number | null {
  if (!postedAt) return null;
  const published = Date.parse(postedAt);
  return Number.isNaN(published) ? null : Math.floor((now - published) / DAY_MS);
}

function rejectIfStale(verdict: Verdict, metrics: PostMetrics | null, now: number, maxAgeDays: number, language: Language): Verdict {
  const days = ageInDays(metrics?.postedAt ?? null, now);
  if (days === null || days <= maxAgeDays) return verdict;
  return {
    ...verdict,
    accepted: false,
    uncertain: false,
    reason: t(language, 'reject.stale', {
      months: Math.floor(days / 30),
      max: Math.round(maxAgeDays / 30),
    }),
    rejection: {
      code: 'reject.stale',
      params: { months: Math.floor(days / 30), max: Math.round(maxAgeDays / 30) },
    },
    rejectedBy: 'stale',
  };
}

function isJudgeable(rules: Verdict): boolean {
  return rules.accepted || rules.rejectedBy !== 'stack';
}

async function judgeOffers(fresh: readonly Offer[], deps: PipelineDeps): Promise<Map<string, JudgeVerdict>> {
  const candidates = fresh.filter((o) => isJudgeable(decideShipping(o, deps.profile)));
  const verdicts = candidates.length && deps.judge
    ? await deps.judge.judge(candidates, deps.profile).catch(() => null)
    : null;
  const byFingerprint = new Map<string, JudgeVerdict>();
  for (const v of verdicts ?? []) {
    const offer = candidates[v.index];
    if (offer) byFingerprint.set(fingerprint(offer.text), v);
  }
  return byFingerprint;
}

function rejectedByOf(judgment: JudgeVerdict): RejectedBy {
  if (!judgment.isOffer) return 'not-offer';
  return judgment.rejection === 'onsite' || judgment.rejection === 'other-country' ? 'location' : 'veto';
}

function applyJudgment(
  rules: Verdict,
  judgment: JudgeVerdict | undefined,
  language: Language,
  profile: CandidateProfile,
  text: string,
): Verdict {
  if (!judgment) return rules;

  if (!judgment.isOffer || judgment.rejection) {
    if (!rules.accepted) return rules;
    return {
      ...rules,
      accepted: false,
      reason: t(language, 'reject.ai', {
        reason: judgment.reason || judgment.rejection || t(language, 'reject.ai.fallback'),
      }),
      rejection: {
        code: 'reject.ai',
        params: { reason: judgment.reason || judgment.rejection || t(language, 'reject.ai.fallback') },
      },
      rejectedBy: rejectedByOf(judgment),
    };
  }

  const refined = {
    ...rules,
    aggregator: judgment.aggregator || rules.aggregator,
  };
  if (rules.accepted) return refined;
  if (rules.rejectedBy === 'stack') return rules;
  if (rules.rejectedBy === 'location' && rules.location === JobLocation.OtherCountry) return rules;

  const location = rules.rejectedBy === 'location' ? JobLocation.Unknown : rules.location;
  if (locationRejectionCode(location, profile.modality)) return rules;
  if (profile.core.length && !matchStack(text, profile.core).length && !isOwnRole(text)) return rules;

  return {
    ...refined,
    accepted: true,
    reason: null,
    rejectedBy: null,
    uncertain: true,
    location,
  };
}

function toNewJob(
  source: string,
  offer: Offer,
  verdict: Verdict,
  judgeStatus: JudgeStatus,
  runId: number,
  metrics: PostMetrics | null,
  employer: string | null,
): NewJob {
  const ad = stripAuthorHeaders(offer.text);
  return {
    source,
    fingerprint: fingerprint(offer.text),
    title: offerTitle(ad),
    role: roleOnly(offerTitle(ad)),
    company: employer ?? companyName(ad),
    author: offer.author ?? null,
    text: storedText(ad),
    url: offer.url,
    location: locationLabel(verdict.location, verdict.reason),
    locationKind: verdict.location,
    verdict: verdict.accepted ? JobVerdict.Accepted : JobVerdict.Rejected,
    rejectionReason: verdict.accepted ? null : verdict.reason,
    rejectionCode: verdict.accepted ? null : verdict.rejection?.code ?? null,
    rejectionParams: verdict.accepted ? null : verdict.rejection?.params ?? null,
    isAggregator: verdict.aggregator,
    isUncertain: verdict.uncertain,
    judgeStatus,
    stackMatch: verdict.stackMatch,
    applyUrl: verdict.applyUrl,
    contactEmail: verdict.contactEmail,
    postedAt: metrics?.postedAt ?? null,
    applications: metrics?.applications ?? null,
    responseDays: metrics?.responseDays ?? null,
    runId,
  };
}
