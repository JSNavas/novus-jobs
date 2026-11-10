import type { JobsRepository, NewJob } from './db/jobs.repository.js';
import type { RunOutcome } from './db/runs.repository.js';
import { decideShipping, fingerprint, locationLabel, storedText, type CandidateProfile, type Offer, type Verdict } from './filters/decide.js';
import type { ClaudeJudge, JudgeVerdict } from './filters/judge.js';
import type { JobSource, RawPost } from './sources/types.js';
import { JobSeniority, JudgeStatus, JobVerdict } from './types.js';

export interface PipelineDeps {
  jobs: JobsRepository;
  judge: ClaudeJudge | null;
  profile: CandidateProfile;
}

/**
 * Una pasada completa: fuente → descartar lo ya visto → reglas → juez → guardar.
 * Se guardan también los descartes con su motivo: una oferta buena descartada
 * por error es la que nadie vería, y el registro permite auditar el criterio.
 */
export async function runPasses(sources: readonly JobSource[], deps: PipelineDeps): Promise<RunOutcome> {
  const total: RunOutcome = { fetched: 0, accepted: 0, rejected: 0 };
  for (const source of sources) {
    const outcome = await runSource(source, deps);
    total.fetched += outcome.fetched;
    total.accepted += outcome.accepted;
    total.rejected += outcome.rejected;
  }
  return total;
}

async function runSource(source: JobSource, deps: PipelineDeps): Promise<RunOutcome> {
  const seen = deps.jobs.fingerprintsOf(source.name);
  const isFresh = (text: string) => !seen.has(fingerprint(text));
  const posts = await source.fetch((list) => indicesToFetchPermalink(list, deps.profile, isFresh));
  const offers: Offer[] = posts.map(toOffer);
  const fresh = offers.filter((o) => isFresh(o.text));
  const judged = await judgeAccepted(fresh, deps);

  const outcome: RunOutcome = { fetched: posts.length, accepted: 0, rejected: 0 };
  for (const offer of fresh) {
    const ruleVerdict = decideShipping(offer, deps.profile);
    const judgment = judged.get(fingerprint(offer.text));
    const verdict = applyJudgment(ruleVerdict, judgment);
    const inserted = deps.jobs.insert(toNewJob(source.name, offer, ruleVerdict, verdict, judgment ? JudgeStatus.Judged : JudgeStatus.Skipped));
    if (!inserted) continue;
    if (verdict.accepted) outcome.accepted++;
    else outcome.rejected++;
  }
  return outcome;
}

/** Solo se pide el permalink de lo que ya encaja por reglas y no se ha visto. */
function indicesToFetchPermalink(posts: readonly RawPost[], profile: CandidateProfile, isFresh: (text: string) => boolean): number[] {
  return posts.flatMap((post, index) => {
    const wanted = isFresh(post.text) && decideShipping(toOffer(post), profile).accepted;
    return wanted ? [index] : [];
  });
}

function toOffer(post: RawPost): Offer {
  return { text: post.text, url: post.url, author: post.author };
}

/**
 * El juez solo ve lo que las reglas aceptaron y solo puede VETAR o afinar. Si
 * no hay clave o falla, el mapa sale vacío y mandan las reglas.
 */
async function judgeAccepted(fresh: readonly Offer[], deps: PipelineDeps): Promise<Map<string, JudgeVerdict>> {
  const candidates = fresh.filter((o) => decideShipping(o, deps.profile).accepted);
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

function applyJudgment(rules: Verdict, judgment: JudgeVerdict | undefined): Verdict {
  if (!judgment || !rules.accepted) return rules;
  if (!judgment.isOffer || judgment.rejection) {
    return { ...rules, accepted: false, reason: `[IA] ${judgment.reason || judgment.rejection || 'no es una oferta'}` };
  }
  return {
    ...rules,
    seniority: judgment.junior ? JobSeniority.Junior : rules.seniority,
    aggregator: judgment.aggregator || rules.aggregator,
  };
}

function toNewJob(
  source: string,
  offer: Offer,
  rules: Verdict,
  verdict: Verdict,
  judgeStatus: JudgeStatus,
): NewJob {
  return {
    source,
    fingerprint: fingerprint(offer.text),
    title: null,
    company: null,
    author: offer.author ?? null,
    text: storedText(offer.text),
    url: offer.url,
    location: locationLabel(rules.location, rules.reason),
    locationKind: rules.location,
    verdict: verdict.accepted ? JobVerdict.Accepted : JobVerdict.Rejected,
    rejectionReason: verdict.accepted ? null : verdict.reason,
    seniority: verdict.seniority,
    isAggregator: verdict.aggregator,
    isUncertain: verdict.uncertain,
    judgeStatus,
    stackMatch: verdict.stackMatch,
    applyUrl: verdict.applyUrl,
    contactEmail: verdict.contactEmail,
    postedAt: null,
  };
}
